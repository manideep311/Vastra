const Product = require('../../models/Product');
const { generateEmbedding } = require('../ai/ai.service');

const listProducts = async (query) => {
  const { keyword, category, color, minPrice, maxPrice, status, page = 1, limit = 20 } = query;

  const filter = {};

  if (keyword) filter.$text = { $search: keyword };
  if (category) filter.category = category;
  if (color) filter.colors = color; // matches if color is in the array
  if (status) filter.status = status;
  if (minPrice || maxPrice) {
    filter.price = {};
    if (minPrice) filter.price.$gte = Number(minPrice);
    if (maxPrice) filter.price.$lte = Number(maxPrice);
  }

  const skip = (Number(page) - 1) * Number(limit);

  const [products, total] = await Promise.all([
    Product.find(filter).select('-embeddingVector').skip(skip).limit(Number(limit)).sort({ createdAt: -1 }),
    Product.countDocuments(filter),
  ]);

  return {
    products,
    pagination: { total, page: Number(page), limit: Number(limit), pages: Math.ceil(total / limit) },
  };
};

const getProductById = async (id) => {
  const product = await Product.findById(id).select('-embeddingVector');
  if (!product) {
    const error = new Error('Product not found');
    error.statusCode = 404;
    throw error;
  }
  return product;
};

const createProduct = async (supplierId, data) => {
  const textForEmbedding = `${data.name} ${data.category} ${data.description || ''}`;
  const embeddingVector = await generateEmbedding(textForEmbedding);
  const product = await Product.create({ ...data, supplierId, embeddingVector });
  return product;
};

const updateProduct = async (supplierId, productId, data) => {
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

  Object.assign(product, data);
  await product.save();
  return product;
};

const deleteProduct = async (supplierId, productId) => {
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

  await product.deleteOne();
  return { message: 'Product deleted' };
};

const listMyProducts = async (supplierId) => {
  return Product.find({ supplierId }).sort({ createdAt: -1 });
};

// Distinct categories currently in use, with product counts — powers dynamic
// marketplace filter chips instead of a hardcoded frontend list.
const getCategoryStats = async () => {
  const stats = await Product.aggregate([
    { $match: { status: 'available' } },
    { $group: { _id: '$category', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
  ]);
  return stats.map((s) => ({ category: s._id, count: s.count }));
};

// Resolves the effective per-unit price for a given quantity, applying the
// highest price tier whose minQty is satisfied. Falls back to the base price
// when no tiers are defined — fully backward compatible.
const getEffectivePrice = (product, quantity) => {
  if (!product.priceTiers || product.priceTiers.length === 0) return product.price;
  const applicable = product.priceTiers
    .filter((tier) => quantity >= tier.minQty)
    .sort((a, b) => b.minQty - a.minQty);
  return applicable.length > 0 ? applicable[0].price : product.price;
};

const addProductImages = async (supplierId, productId, imagePaths) => {
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

  product.images.push(...imagePaths);
  await product.save();
  return product;
};

module.exports = {
  listProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  listMyProducts,
  addProductImages,
  getCategoryStats,
  getEffectivePrice,
};