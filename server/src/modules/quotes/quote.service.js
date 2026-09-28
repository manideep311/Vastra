const Quote = require('../../models/Quote');
const Product = require('../../models/Product');
const Cart = require('../../models/Cart');
const { notify } = require('../notifications/notification.service');
const { httpError, assertObjectId, requireNumber, optionalNumber, requireString, optionalString } = require('../../utils/validate');

const populateOpts = [
  { path: 'productId', select: 'name images category price unit moq' },
  { path: 'buyerId', select: 'email' },
  { path: 'supplierId', select: 'email' },
];

const OPEN_STATUSES = ['pending', 'quoted'];

const requestQuote = async (buyerId, { productId, requestedQuantity: rawQuantity, targetPrice: rawTarget, message: rawMessage }) => {
  assertObjectId(productId, 'product');
  const requestedQuantity = requireNumber(rawQuantity, 'Quantity', { min: 1, max: 1_000_000 });
  const targetPrice = optionalNumber(rawTarget, 'Target price', { min: 0.01, max: 10_000_000 });
  const message = optionalString(rawMessage, 'Message', { max: 1000 }) || undefined;

  const product = await Product.findById(productId).select('supplierId name unit');
  if (!product) throw httpError(404, 'Product not found');

  const duplicate = await Quote.exists({ buyerId, productId, status: { $in: OPEN_STATUSES } });
  if (duplicate) throw httpError(409, 'You already have an open quote for this product. Check My Quotes.');

  const quote = await Quote.create({
    buyerId,
    supplierId: product.supplierId,
    productId,
    requestedQuantity,
    targetPrice,
    message,
    messages: message ? [{ sender: 'buyer', text: message }] : [],
  });

  notify(product.supplierId, {
    type: 'quote_request',
    title: 'New quote request',
    message: `A buyer requested a quote for ${requestedQuantity} ${product.unit || 'unit'} of "${product.name}".`,
    link: '/supplier/quotes',
  });

  return quote.populate(populateOpts);
};

// Quotes past their validUntil date are reported as expired so a buyer can't
// accept a stale offer. Stored lazily — no background job needed.
const expireStale = (filter) =>
  Quote.updateMany({ ...filter, status: 'quoted', validUntil: { $lt: new Date() } }, { status: 'expired' });

const listBuyerQuotes = async (buyerId) => {
  await expireStale({ buyerId });
  return Quote.find({ buyerId }).populate(populateOpts).sort({ createdAt: -1 }).limit(200);
};

const listSupplierQuotes = async (supplierId) => {
  await expireStale({ supplierId });
  return Quote.find({ supplierId }).populate(populateOpts).sort({ createdAt: -1 }).limit(200);
};

const getQuoteForUser = async (userId, quoteId) => {
  const quote = await Quote.findOne({ _id: quoteId, $or: [{ buyerId: userId }, { supplierId: userId }] }).populate(
    populateOpts
  );
  if (!quote) {
    const error = new Error('Quote not found');
    error.statusCode = 404;
    throw error;
  }
  return quote;
};

const respondToQuote = async (supplierId, quoteId, input) => {
  const quotedPrice = requireNumber(input.quotedPrice, 'Quoted price', { min: 0.01, max: 10_000_000 });
  const quotedLeadTime = optionalString(input.quotedLeadTime, 'Lead time', { max: 40 }) || undefined;
  const supplierMessage = optionalString(input.supplierMessage, 'Message', { max: 1000 }) || undefined;
  let validUntil;
  if (input.validUntil) {
    // A bare date from a date picker means "through the end of that day".
    const raw = String(input.validUntil);
    validUntil = new Date(/^\d{4}-\d{2}-\d{2}$/.test(raw) ? `${raw}T23:59:59.999Z` : raw);
    if (Number.isNaN(validUntil.getTime()) || validUntil < new Date()) throw httpError(400, 'Valid-until must be a future date');
  }

  const quote = await Quote.findOne({ _id: quoteId, supplierId });
  if (!quote) {
    const error = new Error('Quote not found');
    error.statusCode = 404;
    throw error;
  }
  if (quote.status !== 'pending' && quote.status !== 'quoted') {
    const error = new Error(`Cannot respond to a quote with status '${quote.status}'`);
    error.statusCode = 400;
    throw error;
  }

  quote.quotedPrice = quotedPrice;
  quote.quotedLeadTime = quotedLeadTime;
  quote.supplierMessage = supplierMessage;
  quote.status = 'quoted';
  if (validUntil) quote.validUntil = validUntil;
  if (supplierMessage) quote.messages.push({ sender: 'supplier', text: supplierMessage });
  await quote.save();

  notify(quote.buyerId, {
    type: 'quote_response',
    title: 'Quote received',
    message: `You received a quote: ₹${quotedPrice}/unit${quotedLeadTime ? `, lead time ${quotedLeadTime}` : ''}.`,
    link: '/quotes',
  });

  return quote.populate(populateOpts);
};

const declineQuote = async (supplierId, quoteId) => {
  const quote = await Quote.findOneAndUpdate(
    { _id: quoteId, supplierId, status: { $in: OPEN_STATUSES } },
    { status: 'rejected' },
    { returnDocument: 'after' }
  );
  if (!quote) throw httpError(404, 'Quote not found or already closed');
  notify(quote.buyerId, {
    type: 'quote_response',
    title: 'Quote declined',
    message: 'A supplier was unable to fulfil your quote request.',
    link: '/quotes',
  });
  return quote.populate(populateOpts);
};

// Accepting a quote adds the negotiated price/quantity straight into the
// buyer's cart, so the existing checkout flow can be reused as-is.
const acceptQuote = async (buyerId, quoteId) => {
  const quote = await Quote.findOne({ _id: quoteId, buyerId });
  if (!quote) {
    const error = new Error('Quote not found');
    error.statusCode = 404;
    throw error;
  }
  if (quote.status !== 'quoted') {
    const error = new Error('Only a quoted request can be accepted');
    error.statusCode = 400;
    throw error;
  }
  if (quote.validUntil && quote.validUntil < new Date()) {
    quote.status = 'expired';
    await quote.save();
    throw httpError(400, 'This quote has expired. Ask the supplier for a fresh quote.');
  }

  const product = await Product.findById(quote.productId);
  if (!product) {
    const error = new Error('Product no longer available');
    error.statusCode = 404;
    throw error;
  }

  let cart = await Cart.findOne({ buyerId });
  if (!cart) cart = await Cart.create({ buyerId, items: [] });

  const existingItem = cart.items.find((item) => item.productId.toString() === quote.productId.toString());
  if (existingItem) {
    existingItem.quantity = quote.requestedQuantity;
    existingItem.priceAtAdd = quote.quotedPrice;
    existingItem.quoteId = quote._id;
  } else {
    cart.items.push({
      productId: quote.productId,
      quantity: quote.requestedQuantity,
      priceAtAdd: quote.quotedPrice,
      quoteId: quote._id,
    });
  }
  await cart.save();

  quote.status = 'accepted';
  await quote.save();

  notify(quote.supplierId, {
    type: 'quote_accepted',
    title: 'Quote accepted',
    message: `Your quote for "${product.name}" was accepted by the buyer.`,
    link: '/supplier/quotes',
  });

  return quote.populate(populateOpts);
};

const rejectQuote = async (buyerId, quoteId) => {
  const quote = await Quote.findOneAndUpdate(
    { _id: quoteId, buyerId, status: { $in: OPEN_STATUSES } },
    { status: 'rejected' },
    { returnDocument: 'after' }
  );
  if (!quote) throw httpError(404, 'Quote not found or already closed');
  return quote.populate(populateOpts);
};

const addMessage = async (userId, role, quoteId, rawText) => {
  const text = requireString(rawText, 'Message', { max: 1000 });
  const ownerField = role === 'buyer' ? 'buyerId' : 'supplierId';
  const quote = await Quote.findOne({ _id: quoteId, [ownerField]: userId });
  if (!quote) {
    const error = new Error('Quote not found');
    error.statusCode = 404;
    throw error;
  }
  quote.messages.push({ sender: role, text });
  await quote.save();

  const recipient = role === 'buyer' ? quote.supplierId : quote.buyerId;
  notify(recipient, {
    type: 'quote_response',
    title: 'New message on your quote',
    message: text.slice(0, 140),
    link: role === 'buyer' ? '/supplier/quotes' : '/quotes',
  });

  return quote.populate(populateOpts);
};

module.exports = {
  requestQuote,
  listBuyerQuotes,
  listSupplierQuotes,
  getQuoteForUser,
  respondToQuote,
  declineQuote,
  acceptQuote,
  rejectQuote,
  addMessage,
};
