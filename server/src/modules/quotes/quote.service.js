const Quote = require('../../models/Quote');
const Product = require('../../models/Product');
const Cart = require('../../models/Cart');
const { notify } = require('../notifications/notification.service');

const populateOpts = [
  { path: 'productId', select: 'name images category price unit moq' },
  { path: 'buyerId', select: 'email' },
  { path: 'supplierId', select: 'email' },
];

const requestQuote = async (buyerId, { productId, requestedQuantity, targetPrice, message }) => {
  const product = await Product.findById(productId);
  if (!product) {
    const error = new Error('Product not found');
    error.statusCode = 404;
    throw error;
  }

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
    message: `A buyer requested a quote for ${requestedQuantity} unit(s) of "${product.name}".`,
    link: '/supplier/quotes',
  });

  return quote.populate(populateOpts);
};

const listBuyerQuotes = async (buyerId) =>
  Quote.find({ buyerId }).populate(populateOpts).sort({ createdAt: -1 });

const listSupplierQuotes = async (supplierId) =>
  Quote.find({ supplierId }).populate(populateOpts).sort({ createdAt: -1 });

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

const respondToQuote = async (supplierId, quoteId, { quotedPrice, quotedLeadTime, supplierMessage, validUntil }) => {
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
    { _id: quoteId, supplierId },
    { status: 'rejected' },
    { new: true }
  );
  if (!quote) {
    const error = new Error('Quote not found');
    error.statusCode = 404;
    throw error;
  }
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
  } else {
    cart.items.push({ productId: quote.productId, quantity: quote.requestedQuantity, priceAtAdd: quote.quotedPrice });
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
  const quote = await Quote.findOneAndUpdate({ _id: quoteId, buyerId }, { status: 'rejected' }, { new: true });
  if (!quote) {
    const error = new Error('Quote not found');
    error.statusCode = 404;
    throw error;
  }
  return quote.populate(populateOpts);
};

const addMessage = async (userId, role, quoteId, text) => {
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
