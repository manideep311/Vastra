const hfClient = require('./ai.client');
const Product = require('../../models/Product');
const BuyerProfile = require('../../models/BuyerProfile');
const { cosineSimilarity } = require('../../utils/similarity');

const suggestQuoteForProduct = async (supplierId, { productId, requestedQuantity, targetPrice }) => {
  const product = await Product.findById(productId);
  if (!product) {
    const error = new Error('Product not found');
    error.statusCode = 404;
    throw error;
  }
  if (product.supplierId.toString() !== supplierId) {
    const error = new Error('You do not own this product');
    error.statusCode = 403;
    throw error;
  }
  return suggestQuote(product, { requestedQuantity, targetPrice });
};

const testConnection = async () => {
  const response = await hfClient.chat.completions.create({
    model: process.env.HF_CHAT_MODEL,
    messages: [{ role: 'user', content: 'Reply with exactly one sentence confirming you are working.' }],
  });
  return response.choices[0].message.content;
};

const generateEmbedding = async (text) => {
  const response = await fetch(
    `https://router.huggingface.co/hf-inference/models/${process.env.HF_EMBEDDING_MODEL}/pipeline/feature-extraction`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.HF_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ inputs: text, options: { wait_for_model: true } }),
    }
  );

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Embedding request failed: ${response.status} ${errorBody}`);
  }

  const data = await response.json();

  if (Array.isArray(data[0])) {
    const tokenCount = data.length;
    const dim = data[0].length;
    const pooled = new Array(dim).fill(0);
    for (const tokenVec of data) {
      for (let i = 0; i < dim; i++) pooled[i] += tokenVec[i];
    }
    return pooled.map((v) => v / tokenCount);
  }

  return data;
};

const semanticSearch = async (queryText, limit = 10) => {
  const queryEmbedding = await generateEmbedding(queryText);
  const products = await Product.find({ embeddingVector: { $exists: true, $ne: [] } });

  const scored = products.map((product) => ({
    product,
    score: cosineSimilarity(queryEmbedding, product.embeddingVector),
  }));

  scored.sort((a, b) => b.score - a.score);

  return scored.slice(0, limit).map((entry) => {
    const { embeddingVector, ...rest } = entry.product.toObject();
    return { ...rest, similarityScore: entry.score };
  });
};

const chatWithAssistant = async (message, history = [], productId = null) => {
  let contextProducts = [];

  if (productId) {
    const product = await Product.findById(productId).select('-embeddingVector');
    if (product) contextProducts = [product.toObject()];
  } else {
    contextProducts = await semanticSearch(message, 5);
  }

  const contextText = contextProducts
    .map(
      (p) =>
        `- ${p.name} (${p.category}): ${p.description}. Price: ₹${p.price}/${p.unit || 'unit'}. Colors: ${(p.colors || []).join(', ')}. Stock: ${p.stock}.`
    )
    .join('\n');

  const systemPrompt = `You are a helpful assistant for a B2B textile marketplace in India connecting buyers and suppliers.
All prices are in Indian Rupees (₹). Answer using ONLY the product information provided below — never invent products, prices, or stock levels that aren't listed.
If nothing relevant is in the context, say so honestly and offer to help the buyer search differently.
Keep responses concise and practical, like a knowledgeable sales assistant.

Relevant products:
${contextText || 'No specific products found matching this query.'}`;

  const messages = [{ role: 'system', content: systemPrompt }, ...history, { role: 'user', content: message }];

  const response = await hfClient.chat.completions.create({
    model: process.env.HF_CHAT_MODEL,
    messages,
  });

  return {
    reply: response.choices[0].message.content,
    referencedProducts: contextProducts,
  };
};

const getSimilarProducts = async (productId, limit = 5) => {
  const target = await Product.findById(productId);
  if (!target || !target.embeddingVector || target.embeddingVector.length === 0) {
    const error = new Error('Product not found or has no embedding');
    error.statusCode = 404;
    throw error;
  }

  const products = await Product.find({
    _id: { $ne: productId },
    embeddingVector: { $exists: true, $ne: [] },
  });

  const scored = products.map((product) => ({
    product,
    score: cosineSimilarity(target.embeddingVector, product.embeddingVector),
  }));

  scored.sort((a, b) => b.score - a.score);

  return scored.slice(0, limit).map((entry) => {
    const { embeddingVector, ...rest } = entry.product.toObject();
    return { ...rest, similarityScore: entry.score };
  });
};

const compareProducts = async (productIds) => {
  const products = await Product.find({ _id: { $in: productIds } }).select('-embeddingVector');
  if (products.length < 2) {
    const error = new Error('Need at least 2 valid products to compare');
    error.statusCode = 400;
    throw error;
  }

  const productText = products
    .map(
      (p, i) =>
        `Product ${i + 1}: ${p.name} (${p.category})\nDescription: ${p.description}\nPrice: ₹${p.price}/${p.unit || 'unit'}\nColors: ${(p.colors || []).join(', ')}\nStock: ${p.stock}`
    )
    .join('\n\n');

  const response = await hfClient.chat.completions.create({
    model: process.env.HF_CHAT_MODEL,
    messages: [
      {
        role: 'system',
        content:
          'You are a fabric marketplace assistant. Compare the given products for a B2B buyer, highlighting differences in price, suitability, and characteristics. Be concise and use a short structured comparison.',
      },
      { role: 'user', content: productText },
    ],
  });

  return {
    comparison: response.choices[0].message.content,
    products,
  };
};

const suggestCategory = async (name, description) => {
  const response = await hfClient.chat.completions.create({
    model: process.env.HF_CHAT_MODEL,
    messages: [
      {
        role: 'system',
        content:
          'You categorize fabric products for a marketplace. Given a product name and description, respond with ONLY a JSON object in the form {"category": "...", "tags": ["...", "..."]} — no other text, no markdown formatting.',
      },
      { role: 'user', content: `Name: ${name}\nDescription: ${description}` },
    ],
  });

  const raw = response.choices[0].message.content;
  try {
    return JSON.parse(raw);
  } catch {
    return { category: null, tags: [], rawResponse: raw };
  }
};

// Helps a supplier respond to an RFQ — suggests a fair per-unit price and lead
// time given the product's base price/tiers, the buyer's requested quantity,
// and their optional target price. Purely advisory: the supplier still submits
// the final numbers themselves.
const suggestQuote = async (product, { requestedQuantity, targetPrice }) => {
  const tiersText = (product.priceTiers || [])
    .map((t) => `${t.minQty}+ units: ₹${t.price}/${product.unit || 'unit'}`)
    .join(', ') || 'none defined';

  const response = await hfClient.chat.completions.create({
    model: process.env.HF_CHAT_MODEL,
    messages: [
      {
        role: 'system',
        content:
          'You help a textile supplier respond to a B2B bulk quote request (RFQ) fairly and competitively. ' +
          'All prices are in Indian Rupees (₹). Respond with ONLY a JSON object in the form ' +
          '{"suggestedPrice": number, "suggestedLeadTime": "...", "reasoning": "..."} — no other text, no markdown formatting. ' +
          'suggestedPrice should be a reasonable per-unit discount off the base price for bulk quantities, informed by any existing price tiers. ' +
          'Keep reasoning to one short sentence.',
      },
      {
        role: 'user',
        content: `Product: ${product.name} (${product.category})\nBase price: ₹${product.price}/${product.unit || 'unit'}\nMOQ: ${product.moq || 1}\nExisting price tiers: ${tiersText}\nStock available: ${product.stock}\n\nBuyer requested quantity: ${requestedQuantity}\nBuyer's target price: ${targetPrice ? `₹${targetPrice}/unit` : 'not specified'}`,
      },
    ],
  });

  const raw = response.choices[0].message.content;
  try {
    return JSON.parse(raw);
  } catch {
    return { suggestedPrice: null, suggestedLeadTime: null, reasoning: raw };
  }
};

const getRecommendationsForBuyer = async (buyerId) => {
  const profile = await BuyerProfile.findOne({ userId: buyerId });
  if (!profile) {
    const error = new Error('Complete onboarding first to get personalized recommendations');
    error.statusCode = 400;
    throw error;
  }

  const queryText = `${(profile.preferredFabricTypes || []).join(', ')} ${(profile.categoriesOfInterest || []).join(
    ', '
  )} for a ${profile.businessType || ''} business in ${profile.industry || ''}`;

  return semanticSearch(queryText, 5);
};

module.exports = {
  testConnection,
  generateEmbedding,
  semanticSearch,
  chatWithAssistant,
  getSimilarProducts,
  compareProducts,
  suggestCategory,
  suggestQuoteForProduct,
  getRecommendationsForBuyer,
};