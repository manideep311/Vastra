const hfClient = require('./ai.client');
const Product = require('../../models/Product');
const BuyerProfile = require('../../models/BuyerProfile');
const { cosineSimilarity } = require('../../utils/similarity');
const { httpError, requireString, optionalString, requireNumber, optionalNumber, isObjectId } = require('../../utils/validate');

// Fields sent back with AI results — enough to render a product row/card.
const RESULT_FIELDS = 'name category images colors stock price status unit moq leadTime ratingAverage ratingCount description';

const aiUnavailable = () => httpError(503, 'The assistant is temporarily unavailable. Please try again in a moment.');

// ---------------------------------------------------------------------------
// Caches
// ---------------------------------------------------------------------------

// Small LRU for embeddings of free text (search queries, buyer profiles).
// The same query typed twice — or the same suggestion chip tapped by many
// buyers — only costs one inference call.
const EMBEDDING_CACHE_SIZE = 300;
const embeddingCache = new Map();

const rememberEmbedding = (key, vector) => {
  embeddingCache.delete(key);
  embeddingCache.set(key, vector);
  if (embeddingCache.size > EMBEDDING_CACHE_SIZE) {
    embeddingCache.delete(embeddingCache.keys().next().value);
  }
};

// In-memory vector index of every embedded product. Loaded once and reused
// by semantic search, chat and similar-products instead of pulling every
// product document (with its vector) from MongoDB on each request.
// Product create/update/delete calls invalidateProductIndex().
const INDEX_TTL_MS = 10 * 60 * 1000;
let productIndex = null; // { entries: [{ id, vector }], byId: Map, loadedAt }
let productIndexPromise = null;
const similarCache = new Map(); // productId -> [productId, ...]

const invalidateProductIndex = () => {
  productIndex = null;
  similarCache.clear();
};

const loadProductIndex = async () => {
  if (productIndex && Date.now() - productIndex.loadedAt < INDEX_TTL_MS) return productIndex;
  if (!productIndexPromise) {
    // Object projection: explicit inclusion is what un-hides a select:false field
    // (a '_id +embeddingVector' string projection silently returns only _id).
    productIndexPromise = Product.find({ embeddingVector: { $exists: true, $ne: [] } })
      .select({ embeddingVector: 1 })
      .lean()
      .then((docs) => {
        const entries = docs
          .filter((d) => Array.isArray(d.embeddingVector) && d.embeddingVector.length > 0)
          .map((d) => ({ id: d._id.toString(), vector: d.embeddingVector }));
        productIndex = { entries, byId: new Map(entries.map((e) => [e.id, e.vector])), loadedAt: Date.now() };
        similarCache.clear();
        return productIndex;
      })
      .finally(() => {
        productIndexPromise = null;
      });
  }
  return productIndexPromise;
};

const rankAgainstIndex = (index, queryVector, { limit, excludeId } = {}) =>
  index.entries
    .filter((e) => e.id !== excludeId && e.vector.length === queryVector.length)
    .map((e) => ({ id: e.id, score: cosineSimilarity(queryVector, e.vector) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

// Fetches ranked products in one query and restores the ranking order.
const hydrateRanked = async (ranked) => {
  if (ranked.length === 0) return [];
  const docs = await Product.find({ _id: { $in: ranked.map((r) => r.id) } }).select(RESULT_FIELDS).lean();
  const byId = new Map(docs.map((d) => [d._id.toString(), d]));
  return ranked.filter((r) => byId.has(r.id)).map((r) => ({ ...byId.get(r.id), similarityScore: r.score }));
};

// ---------------------------------------------------------------------------
// Model calls
// ---------------------------------------------------------------------------

const generateEmbedding = async (text) => {
  const key = text.trim().toLowerCase().replace(/\s+/g, ' ').slice(0, 1000);
  if (embeddingCache.has(key)) {
    const cached = embeddingCache.get(key);
    rememberEmbedding(key, cached); // refresh LRU position
    return cached;
  }

  const response = await fetch(
    `https://router.huggingface.co/hf-inference/models/${process.env.HF_EMBEDDING_MODEL}/pipeline/feature-extraction`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.HF_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ inputs: text.trim().slice(0, 2000), options: { wait_for_model: true } }),
      signal: AbortSignal.timeout(20_000),
    }
  );

  if (!response.ok) {
    throw new Error(`Embedding request failed with status ${response.status}`);
  }

  const data = await response.json();

  let vector = data;
  if (Array.isArray(data[0])) {
    // Token-level output — mean-pool into a single sentence vector.
    const tokenCount = data.length;
    const dim = data[0].length;
    vector = new Array(dim).fill(0);
    for (const tokenVec of data) {
      for (let i = 0; i < dim; i++) vector[i] += tokenVec[i];
    }
    vector = vector.map((v) => v / tokenCount);
  }

  rememberEmbedding(key, vector);
  return vector;
};

const complete = async (messages) => {
  try {
    const response = await hfClient.chat.completions.create({ model: process.env.HF_CHAT_MODEL, messages });
    const content = response.choices?.[0]?.message?.content;
    if (!content) throw new Error('Empty completion');
    return content.trim();
  } catch (error) {
    console.error('AI completion failed:', error.message);
    throw aiUnavailable();
  }
};

// Models sometimes wrap JSON in ```json fences or add a sentence around it.
const parseJsonObject = (raw) => {
  const match = raw.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    return JSON.parse(match[0]);
  } catch {
    return null;
  }
};

// ---------------------------------------------------------------------------
// Features
// ---------------------------------------------------------------------------

const testConnection = async () =>
  complete([{ role: 'user', content: 'Reply with exactly one sentence confirming you are working.' }]);

const semanticSearch = async (queryText, limit = 10) => {
  const query = requireString(queryText, 'Search query', { max: 300 });
  const limitNum = Math.min(20, Math.max(1, Number(limit) || 10));
  const [queryVector, index] = await Promise.all([
    generateEmbedding(query).catch((error) => {
      console.error('Embedding failed:', error.message);
      throw aiUnavailable();
    }),
    loadProductIndex(),
  ]);
  return hydrateRanked(rankAgainstIndex(index, queryVector, { limit: limitNum }));
};

// Keyword fallback so the assistant still has real catalog context when the
// embedding model is down.
const keywordSearch = async (text, limit) =>
  Product.find({ $text: { $search: text } }, { score: { $meta: 'textScore' } })
    .select(RESULT_FIELDS)
    .sort({ score: { $meta: 'textScore' } })
    .limit(limit)
    .lean()
    .catch(() => []);

const MAX_HISTORY_TURNS = 10;

// Only plain user/assistant turns from the client are forwarded — a crafted
// request can't inject a "system" message or an oversized prompt.
const sanitizeHistory = (history) => {
  if (!Array.isArray(history)) return [];
  return history
    .filter((m) => m && ['user', 'assistant'].includes(m.role) && typeof m.content === 'string' && m.content.trim())
    .slice(-MAX_HISTORY_TURNS)
    .map((m) => ({ role: m.role, content: m.content.slice(0, 1500) }));
};

const describeForPrompt = (p) => {
  const unit = p.unit || 'unit';
  const moqNote = p.moq > 1 ? ` MOQ: ${p.moq} ${unit}.` : '';
  const stock = p.stock > 0 && p.status !== 'out_of_stock' ? `${p.stock} ${unit} available` : 'out of stock';
  return `- ${p.name} (${p.category}): ${(p.description || '').slice(0, 300)}. Price: ₹${p.price}/${unit}.${moqNote} Colors: ${(p.colors || []).join(', ') || 'n/a'}. Stock: ${stock}.`;
};

const chatWithAssistant = async (rawMessage, rawHistory = [], productId = null) => {
  const message = requireString(rawMessage, 'Message', { max: 1000 });
  const history = sanitizeHistory(rawHistory);

  let contextProducts = [];
  if (productId && isObjectId(productId)) {
    const product = await Product.findById(productId).select(RESULT_FIELDS).lean();
    if (product) contextProducts = [product];
  }
  if (contextProducts.length === 0) {
    try {
      contextProducts = await semanticSearch(message, 5);
    } catch (error) {
      console.warn('Semantic search unavailable, using keyword search:', error.message);
      contextProducts = await keywordSearch(message, 5);
    }
  }

  const systemPrompt = `You are Vastra Assistant, a helpful assistant for a B2B textile marketplace in India connecting buyers and suppliers.
All prices are in Indian Rupees (₹). Answer using ONLY the product information provided below — never invent products, prices, stock levels, or minimum order quantities that aren't listed.
If nothing relevant is in the context, say so honestly and offer to help the buyer search differently instead of guessing.
When a product has a minimum order quantity (MOQ), mention it so the buyer isn't surprised at checkout. If a product is out of stock, say so and suggest the closest in-stock alternative from the list if one fits.
If the buyer's request is vague (e.g. just "fabric" or "something nice"), ask one short clarifying question — end use, budget, or preferred fiber — instead of guessing.
Keep responses concise and practical, like a knowledgeable sales assistant, and end with a brief, relevant follow-up question or suggestion when it naturally helps the buyer move forward (e.g. comparing two options, or checking bulk pricing).
Do not use markdown tables.

Relevant products:
${contextProducts.map(describeForPrompt).join('\n') || 'No specific products found matching this query.'}`;

  const reply = await complete([{ role: 'system', content: systemPrompt }, ...history, { role: 'user', content: message }]);

  return {
    reply,
    referencedProducts: contextProducts.map(({ description, similarityScore, ...rest }) => rest),
  };
};

const getSimilarProducts = async (productId, limit = 5) => {
  if (similarCache.has(productId)) {
    return hydrateRanked(similarCache.get(productId).map((id) => ({ id })));
  }

  const index = await loadProductIndex();
  const targetVector = index.byId.get(productId);
  if (!targetVector) return []; // no embedding yet — the UI simply hides the section

  const ranked = rankAgainstIndex(index, targetVector, { limit, excludeId: productId });
  similarCache.set(productId, ranked.map((r) => r.id));
  return hydrateRanked(ranked);
};

const compareProducts = async (productIds) => {
  if (!Array.isArray(productIds) || productIds.length < 2 || productIds.length > 4 || !productIds.every(isObjectId)) {
    throw httpError(400, 'Choose between 2 and 4 products to compare');
  }
  const products = await Product.find({ _id: { $in: productIds } }).select(RESULT_FIELDS).lean();
  if (products.length < 2) throw httpError(400, 'Need at least 2 valid products to compare');

  const productText = products
    .map(
      (p, i) =>
        `Product ${i + 1}: ${p.name} (${p.category})\nDescription: ${(p.description || '').slice(0, 400)}\nPrice: ₹${p.price}/${p.unit || 'unit'}\nColors: ${(p.colors || []).join(', ')}\nStock: ${p.stock}`
    )
    .join('\n\n');

  const comparison = await complete([
    {
      role: 'system',
      content:
        'You are a fabric marketplace assistant. Compare the given products for a B2B buyer, highlighting differences in price, suitability, and characteristics. Be concise and use a short structured comparison.',
    },
    { role: 'user', content: productText },
  ]);

  return { comparison, products };
};

const suggestCategory = async (rawName, rawDescription) => {
  const name = requireString(rawName, 'Product name', { max: 120 });
  const description = optionalString(rawDescription, 'Description', { max: 2000 }) || '';

  const raw = await complete([
    {
      role: 'system',
      content:
        'You categorize fabric products for a marketplace. Given a product name and description, respond with ONLY a JSON object in the form {"category": "...", "tags": ["...", "..."]} — no other text, no markdown formatting.',
    },
    { role: 'user', content: `Name: ${name}\nDescription: ${description}` },
  ]);

  const parsed = parseJsonObject(raw);
  const category = typeof parsed?.category === 'string' ? parsed.category.trim().slice(0, 60) : null;
  const tags = Array.isArray(parsed?.tags)
    ? parsed.tags.filter((t) => typeof t === 'string').map((t) => t.trim().slice(0, 40)).filter(Boolean).slice(0, 8)
    : [];
  return { category, tags };
};

// Helps a supplier respond to an RFQ — suggests a fair per-unit price and lead
// time given the product's base price/tiers, the buyer's requested quantity,
// and their optional target price. Purely advisory: the supplier still submits
// the final numbers themselves.
const suggestQuote = async (product, { requestedQuantity, targetPrice }) => {
  const tiersText = (product.priceTiers || [])
    .map((t) => `${t.minQty}+ units: ₹${t.price}/${product.unit || 'unit'}`)
    .join(', ') || 'none defined';

  const raw = await complete([
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
  ]);

  const parsed = parseJsonObject(raw);
  const price = Number(parsed?.suggestedPrice);
  return {
    suggestedPrice: Number.isFinite(price) && price > 0 ? Math.round(price * 100) / 100 : null,
    suggestedLeadTime: typeof parsed?.suggestedLeadTime === 'string' ? parsed.suggestedLeadTime.slice(0, 40) : null,
    reasoning: typeof parsed?.reasoning === 'string' ? parsed.reasoning.slice(0, 300) : raw.slice(0, 300),
  };
};

const suggestQuoteForProduct = async (supplierId, { productId, requestedQuantity, targetPrice }) => {
  if (!isObjectId(productId)) throw httpError(400, 'Invalid product');
  const quantity = requireNumber(requestedQuantity, 'Requested quantity', { min: 0.01, max: 1_000_000 });
  const target = optionalNumber(targetPrice, 'Target price', { min: 0 });

  const product = await Product.findById(productId).lean();
  if (!product) throw httpError(404, 'Product not found');
  if (product.supplierId.toString() !== supplierId) throw httpError(403, 'You do not own this product');

  return suggestQuote(product, { requestedQuantity: quantity, targetPrice: target });
};

const getRecommendationsForBuyer = async (buyerId) => {
  const profile = await BuyerProfile.findOne({ userId: buyerId }).lean();
  if (!profile) throw httpError(400, 'Complete onboarding first to get personalized recommendations');

  const queryText = `${(profile.preferredFabricTypes || []).join(', ')} ${(profile.categoriesOfInterest || []).join(
    ', '
  )} for a ${profile.businessType || ''} business in ${profile.industry || ''}`;

  try {
    return await semanticSearch(queryText, 5);
  } catch (error) {
    console.warn('Recommendations unavailable:', error.message);
    return [];
  }
};

module.exports = {
  testConnection,
  generateEmbedding,
  invalidateProductIndex,
  semanticSearch,
  chatWithAssistant,
  getSimilarProducts,
  compareProducts,
  suggestCategory,
  suggestQuoteForProduct,
  getRecommendationsForBuyer,
};
