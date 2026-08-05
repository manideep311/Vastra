const { listProductReviews, upsertReview } = require('./review.service');

const getForProduct = async (req, res, next) => {
  try {
    const result = await listProductReviews(req.params.productId, req.query);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

const postReview = async (req, res, next) => {
  try {
    const { rating, comment } = req.body;
    const review = await upsertReview(req.user.userId, req.params.productId, { rating, comment });
    res.status(201).json({ review });
  } catch (error) {
    next(error);
  }
};

module.exports = { getForProduct, postReview };
