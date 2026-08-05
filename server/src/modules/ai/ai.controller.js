const {
  testConnection,
  semanticSearch,
  chatWithAssistant,
  getSimilarProducts,
  compareProducts,
  suggestCategory,
  suggestQuoteForProduct,
  getRecommendationsForBuyer,
} = require('./ai.service');

const ping = async (req, res, next) => {
  try {
    res.status(200).json({ message: await testConnection() });
  } catch (error) {
    next(error);
  }
};

const search = async (req, res, next) => {
  try {
    const results = await semanticSearch(req.body.query);
    res.status(200).json({ results });
  } catch (error) {
    next(error);
  }
};

const chat = async (req, res, next) => {
  try {
    const { message, history, productId } = req.body;
    const result = await chatWithAssistant(message, history || [], productId || null);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

const similar = async (req, res, next) => {
  try {
    const results = await getSimilarProducts(req.params.productId);
    res.status(200).json({ results });
  } catch (error) {
    next(error);
  }
};

const compare = async (req, res, next) => {
  try {
    const result = await compareProducts(req.body.productIds);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

const categorize = async (req, res, next) => {
  try {
    const { name, description } = req.body;
    const result = await suggestCategory(name, description);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

const recommendations = async (req, res, next) => {
  try {
    const results = await getRecommendationsForBuyer(req.user.userId);
    res.status(200).json({ results });
  } catch (error) {
    next(error);
  }
};

const suggestQuote = async (req, res, next) => {
  try {
    const { productId, requestedQuantity, targetPrice } = req.body;
    const result = await suggestQuoteForProduct(req.user.userId, { productId, requestedQuantity, targetPrice });
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

module.exports = { ping, search, chat, similar, compare, categorize, recommendations, suggestQuote };