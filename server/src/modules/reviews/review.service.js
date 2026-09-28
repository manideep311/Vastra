const Review = require('../../models/Review');
const Product = require('../../models/Product');
const Order = require('../../models/Order');
const mongoose = require('mongoose');
const { notify } = require('../notifications/notification.service');
const { httpError, requireNumber, optionalString, pagination } = require('../../utils/validate');

// Recomputes and persists the aggregate rating on the product document.
const recalculateProductRating = async (productId) => {
  const [agg] = await Review.aggregate([
    // aggregate() bypasses schema casting — the id must be an ObjectId here.
    { $match: { productId: new mongoose.Types.ObjectId(productId) } },
    { $group: { _id: '$productId', avg: { $avg: '$rating' }, count: { $sum: 1 } } },
  ]);
  await Product.findByIdAndUpdate(productId, {
    ratingAverage: agg ? Math.round(agg.avg * 10) / 10 : 0,
    ratingCount: agg ? agg.count : 0,
  });
};

// Public endpoint — reviewer identity is never included (no emails or ids).
const listProductReviews = async (productId, query = {}) => {
  const { page, limit, skip } = pagination(query, { defaultLimit: 20, maxLimit: 50 });
  const [reviews, total, product] = await Promise.all([
    Review.find({ productId })
      .select('rating comment verifiedPurchase createdAt')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Review.countDocuments({ productId }),
    Product.findById(productId).select('ratingAverage ratingCount').lean(),
  ]);
  return {
    reviews,
    ratingAverage: product?.ratingAverage || 0,
    ratingCount: product?.ratingCount || 0,
    pagination: { total, page, limit },
  };
};

const upsertReview = async (buyerId, productId, input) => {
  const rating = requireNumber(input.rating, 'Rating', { min: 1, max: 5, integer: true });
  const comment = optionalString(input.comment, 'Review', { max: 1000 }) || '';

  const product = await Product.findById(productId).select('supplierId name');
  if (!product) throw httpError(404, 'Product not found');

  const verifiedPurchase = Boolean(
    await Order.exists({ buyerId, 'items.productId': productId, status: 'completed' })
  );

  const review = await Review.findOneAndUpdate(
    { productId, buyerId },
    { rating, comment, verifiedPurchase },
    { returnDocument: 'after', upsert: true, runValidators: true, setDefaultsOnInsert: true }
  );

  await recalculateProductRating(productId);

  notify(product.supplierId, {
    type: 'review',
    title: 'New product review',
    message: `Your product "${product.name}" received a ${rating}-star review.`,
    link: `/supplier/inventory`,
  });

  const { buyerId: _omit, ...publicReview } = review.toObject();
  return publicReview;
};

module.exports = { listProductReviews, upsertReview };
