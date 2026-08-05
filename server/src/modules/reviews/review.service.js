const Review = require('../../models/Review');
const Product = require('../../models/Product');
const Order = require('../../models/Order');
const { notify } = require('../notifications/notification.service');

// Recomputes and persists the aggregate rating on the product document.
const recalculateProductRating = async (productId) => {
  const [agg] = await Review.aggregate([
    { $match: { productId } },
    { $group: { _id: '$productId', avg: { $avg: '$rating' }, count: { $sum: 1 } } },
  ]);
  await Product.findByIdAndUpdate(productId, {
    ratingAverage: agg ? Math.round(agg.avg * 10) / 10 : 0,
    ratingCount: agg ? agg.count : 0,
  });
};

const listProductReviews = async (productId, { page = 1, limit = 20 } = {}) => {
  const skip = (Number(page) - 1) * Number(limit);
  const [reviews, total, product] = await Promise.all([
    Review.find({ productId }).populate('buyerId', 'email').sort({ createdAt: -1 }).skip(skip).limit(Number(limit)),
    Review.countDocuments({ productId }),
    Product.findById(productId).select('ratingAverage ratingCount'),
  ]);
  return {
    reviews,
    ratingAverage: product?.ratingAverage || 0,
    ratingCount: product?.ratingCount || 0,
    pagination: { total, page: Number(page), limit: Number(limit) },
  };
};

const upsertReview = async (buyerId, productId, { rating, comment }) => {
  const product = await Product.findById(productId);
  if (!product) {
    const error = new Error('Product not found');
    error.statusCode = 404;
    throw error;
  }

  const verifiedPurchase = Boolean(
    await Order.exists({ buyerId, 'items.productId': productId, status: 'completed' })
  );

  const review = await Review.findOneAndUpdate(
    { productId, buyerId },
    { rating, comment, verifiedPurchase },
    { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
  );

  await recalculateProductRating(productId);

  notify(product.supplierId, {
    type: 'review',
    title: 'New product review',
    message: `Your product "${product.name}" received a ${rating}-star review.`,
    link: `/supplier/inventory`,
  });

  return review;
};

module.exports = { listProductReviews, upsertReview };
