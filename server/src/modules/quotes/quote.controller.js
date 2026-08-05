const {
  requestQuote,
  listBuyerQuotes,
  getQuoteForUser,
  acceptQuote,
  rejectQuote,
  addMessage,
} = require('./quote.service');

const create = async (req, res, next) => {
  try {
    const { productId, requestedQuantity, targetPrice, message } = req.body;
    const quote = await requestQuote(req.user.userId, { productId, requestedQuantity, targetPrice, message });
    res.status(201).json({ quote });
  } catch (error) {
    next(error);
  }
};

const getMine = async (req, res, next) => {
  try {
    const quotes = await listBuyerQuotes(req.user.userId);
    res.status(200).json({ quotes });
  } catch (error) {
    next(error);
  }
};

const getOne = async (req, res, next) => {
  try {
    const quote = await getQuoteForUser(req.user.userId, req.params.id);
    res.status(200).json({ quote });
  } catch (error) {
    next(error);
  }
};

const accept = async (req, res, next) => {
  try {
    const quote = await acceptQuote(req.user.userId, req.params.id);
    res.status(200).json({ quote });
  } catch (error) {
    next(error);
  }
};

const reject = async (req, res, next) => {
  try {
    const quote = await rejectQuote(req.user.userId, req.params.id);
    res.status(200).json({ quote });
  } catch (error) {
    next(error);
  }
};

const message = async (req, res, next) => {
  try {
    const quote = await addMessage(req.user.userId, 'buyer', req.params.id, req.body.text);
    res.status(200).json({ quote });
  } catch (error) {
    next(error);
  }
};

module.exports = { create, getMine, getOne, accept, reject, message };
