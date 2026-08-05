const { listSupplierQuotes, getQuoteForUser, respondToQuote, declineQuote, addMessage } = require('../quotes/quote.service');

const listQuotes = async (req, res, next) => {
  try {
    const quotes = await listSupplierQuotes(req.user.userId);
    res.status(200).json({ quotes });
  } catch (error) {
    next(error);
  }
};

const getQuote = async (req, res, next) => {
  try {
    const quote = await getQuoteForUser(req.user.userId, req.params.id);
    res.status(200).json({ quote });
  } catch (error) {
    next(error);
  }
};

const respond = async (req, res, next) => {
  try {
    const { quotedPrice, quotedLeadTime, supplierMessage, validUntil } = req.body;
    const quote = await respondToQuote(req.user.userId, req.params.id, {
      quotedPrice,
      quotedLeadTime,
      supplierMessage,
      validUntil,
    });
    res.status(200).json({ quote });
  } catch (error) {
    next(error);
  }
};

const decline = async (req, res, next) => {
  try {
    const quote = await declineQuote(req.user.userId, req.params.id);
    res.status(200).json({ quote });
  } catch (error) {
    next(error);
  }
};

const message = async (req, res, next) => {
  try {
    const quote = await addMessage(req.user.userId, 'supplier', req.params.id, req.body.text);
    res.status(200).json({ quote });
  } catch (error) {
    next(error);
  }
};

module.exports = { listQuotes, getQuote, respond, decline, message };
