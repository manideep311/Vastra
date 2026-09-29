const fs = require('fs/promises');
const path = require('path');
const Product = require('../../models/Product');
const SupplierProfile = require('../../models/SupplierProfile');
const { generateEmbedding, invalidateProductIndex } = require('../ai/ai.service');
const { UPLOAD_DIR } = require('../../middleware/upload.middleware');
const { saveImage, deleteImage, isStoredImage } = require('../../utils/imageStore');
const {
  httpError,
  requireNumber,
  optionalNumber,
  requireString,
  optionalString,
  stringList,
  oneOf,
  pagination,
} = require('../../utils/validate');

const UNITS = ['kg', 'meter', 'unit'];
const STATUSES = ['available', 'out_of_stock'];
const MAX_IMAGES = 8;
const MAX_PRICE = 10_000_000;

const SORTS = {
  newest: { createdAt: -1 },
  price_asc: { price: 1, createdAt: -1 },
  price_desc: { price: -1, createdAt: -1 },
  rating: { ratingAverage: -1, ratingCount: -1, createdAt: -1 },
};

// Fields a buyer-facing list needs. Descriptions/specs stay on the detail endpoint.
const LIST_FIELDS = 'name category images colors stock price status unit moq leadTime gsm fabricWidth fabricComposition ratingAverage ratingCount supplierId createdAt';

// Public supplier summary shown next to a listing. Contact details are not
// included — only what a buyer needs to judge the source.
const SUPPLIER_LIST_FIELDS = 'userId businessName isVerified verificationBadge';
const SUPPLIER_DETAIL_FIELDS = `${SUPPLIER_LIST_FIELDS} businessType businessAddress operatingHours completedOrders about`;

// One indexed lookup for the whole page instead of a query per product.
const attachSuppliers = async (products, fields = SUPPLIER_LIST_FIELDS) => {
  const ids = [...new Set(products.map((p) => p.supplierId?.toString()).filter(Boolean))];
  if (ids.length === 0) return products;
  const profiles = await SupplierProfile.find({ userId: { $in: ids } }).select(fields).lean();
  const byUser = new Map(profiles.map(({ userId, _id, ...rest }) => [userId.toString(), rest]));
  return products.map((p) => ({ ...p, supplier: byUser.get(p.supplierId?.toString()) || null }));
};

const listProducts = async (query) => {
  const { page, limit, skip } = pagination(query, { defaultLimit: 20, maxLimit: 50 });
  const keyword = optionalString(query.keyword, 'Search', { max: 100 });
  const category = optionalString(query.category, 'Category', { max: 60 });
  const color = optionalString(query.color, 'Color', { max: 40 });
  const sort = SORTS[query.sort] ? query.sort : 'newest';

  const filter = {};
  if (keyword) filter.$text = { $search: keyword };
  if (category) filter.category = category;
  if (color) filter.colors = color; // matches if color is in the array
  if (query.status) filter.status = oneOf(query.status, STATUSES, 'status');
  const minPrice = optionalNumber(query.minPrice, 'Minimum price', { min: 0 });
  const maxPrice = optionalNumber(query.maxPrice, 'Maximum price', { min: 0 });
  if (minPrice !== undefined || maxPrice !== undefined) {
    filter.price = {};
    if (minPrice !== undefined) filter.price.$gte = minPrice;
    if (maxPrice !== undefined) filter.price.$lte = maxPrice;
  }

  const [products, total] = await Promise.all([
    Product.find(filter).select(LIST_FIELDS).sort(SORTS[sort]).skip(skip).limit(limit).lean(),
    Product.countDocuments(filter),
  ]);

  return {
    products: await attachSuppliers(products),
    pagination: { total, page, limit, pages: Math.ceil(total / limit) },
  };
};

const getProductById = async (id) => {
  const product = await Product.findById(id).lean();
  if (!product) throw httpError(404, 'Product not found');
  const [withSupplier] = await attachSuppliers([product], SUPPLIER_DETAIL_FIELDS);
  return withSupplier;
};

const validatePriceTiers = (tiers) => {
  if (tiers === undefined) return undefined;
  if (!Array.isArray(tiers) || tiers.length > 10) throw httpError(400, 'Price tiers must be a list of up to 10 tiers');
  return tiers
    .map((tier) => ({
      minQty: requireNumber(tier?.minQty, 'Tier quantity', { min: 1, max: 1_000_000 }),
      price: requireNumber(tier?.price, 'Tier price', { min: 0.01, max: MAX_PRICE }),
    }))
    .sort((a, b) => a.minQty - b.minQty);
};

const validateSpecifications = (specs) => {
  if (specs === undefined) return undefined;
  if (specs === null || typeof specs !== 'object' || Array.isArray(specs) || Object.keys(specs).length > 20) {
    throw httpError(400, 'Specifications must be a set of up to 20 key/value pairs');
  }
  return Object.fromEntries(
    Object.entries(specs).map(([key, value]) => [
      requireString(key, 'Specification name', { max: 40 }),
      requireString(String(value), 'Specification value', { max: 120 }),
    ])
  );
};

// Whitelists and validates everything a supplier may set on a product.
// System-managed fields (supplierId, ratings, embeddingVector) can never come
// from the request body. With `partial`, only provided fields are returned.
const sanitizeProductInput = (data, { partial = false } = {}) => {
  const body = data || {};
  const has = (key) => body[key] !== undefined;
  const out = {};

  if (!partial || has('name')) out.name = requireString(body.name, 'Product name', { max: 120 });
  if (!partial || has('category')) out.category = requireString(body.category, 'Category', { max: 60 });
  if (!partial || has('price')) out.price = requireNumber(body.price, 'Price', { min: 0.01, max: MAX_PRICE });
  if (!partial || has('stock')) out.stock = requireNumber(body.stock, 'Stock', { min: 0, max: 10_000_000 });
  if (has('description')) out.description = optionalString(body.description, 'Description', { max: 2000 });
  if (has('unit')) out.unit = oneOf(body.unit, UNITS, 'unit');
  if (has('status')) out.status = oneOf(body.status, STATUSES, 'status');
  if (has('moq')) out.moq = optionalNumber(body.moq, 'MOQ', { min: 1, max: 1_000_000 }) ?? 1;
  if (has('gsm')) out.gsm = optionalNumber(body.gsm, 'GSM', { min: 1, max: 2000 });
  if (has('leadTime')) out.leadTime = optionalString(body.leadTime, 'Lead time', { max: 40 });
  if (has('fabricWidth')) out.fabricWidth = optionalString(body.fabricWidth, 'Fabric width', { max: 40 });
  if (has('rollLength')) out.rollLength = optionalString(body.rollLength, 'Roll length', { max: 40 });
  if (has('fabricComposition')) out.fabricComposition = optionalString(body.fabricComposition, 'Fabric composition', { max: 120 });
  if (has('colors')) out.colors = stringList(body.colors, 'Colors', { maxItems: 20, maxLength: 40 });
  if (has('tags')) out.tags = stringList(body.tags, 'Tags', { maxItems: 20, maxLength: 40 });
  if (has('priceTiers')) out.priceTiers = validatePriceTiers(body.priceTiers);
  if (has('specifications')) out.specifications = validateSpecifications(body.specifications);

  return out;
};

// Keeps stock and availability consistent regardless of what the form sent.
const reconcileStatus = (product) => {
  if (product.stock <= 0) product.status = 'out_of_stock';
};

const embeddingTextFor = (p) => `${p.name} ${p.category} ${p.description || ''} ${(p.tags || []).join(' ')}`;

// Embeddings power semantic search/similar products, but a slow or failing
// AI provider must never block a supplier from listing a product.
const tryGenerateEmbedding = async (product) => {
  try {
    return await generateEmbedding(embeddingTextFor(product));
  } catch (error) {
    console.warn(`Embedding skipped for "${product.name}": ${error.message}`);
    return undefined;
  }
};

const findOwnedProduct = async (supplierId, productId, projection) => {
  const query = Product.findById(productId);
  const product = await (projection ? query.select(projection) : query);
  if (!product) throw httpError(404, 'Product not found');
  if (product.supplierId.toString() !== supplierId) throw httpError(403, 'You do not own this product');
  return product;
};

const createProduct = async (supplierId, data) => {
  const fields = sanitizeProductInput(data);
  const product = new Product({ ...fields, supplierId });
  reconcileStatus(product);

  product.embeddingVector = await tryGenerateEmbedding(product);
  await product.save();
  invalidateProductIndex();

  const saved = product.toObject();
  delete saved.embeddingVector;
  return saved;
};

const updateProduct = async (supplierId, productId, data) => {
  const product = await findOwnedProduct(supplierId, productId);
  const fields = sanitizeProductInput(data, { partial: true });

  // Images can only be reordered/removed here — new files go through the
  // upload endpoint, so arbitrary URLs can't be injected into a listing.
  let removedImages = [];
  if (data?.images !== undefined) {
    if (!Array.isArray(data.images) || !data.images.every((img) => product.images.includes(img))) {
      throw httpError(400, 'Images can only be reordered or removed');
    }
    removedImages = product.images.filter((img) => !data.images.includes(img));
    fields.images = data.images;
  }

  const textChanged = ['name', 'category', 'description', 'tags'].some(
    (key) => fields[key] !== undefined && JSON.stringify(fields[key]) !== JSON.stringify(product[key])
  );

  Object.assign(product, fields);
  if (fields.status === 'available' && product.stock <= 0) {
    throw httpError(400, 'Add stock before marking this product available');
  }
  reconcileStatus(product);

  if (textChanged) {
    const vector = await tryGenerateEmbedding(product);
    if (vector) product.embeddingVector = vector;
  }

  await product.save();
  if (textChanged) invalidateProductIndex();
  await removeStoredImages(removedImages);

  const saved = product.toObject();
  delete saved.embeddingVector;
  return saved;
};

const deleteProduct = async (supplierId, productId) => {
  const product = await findOwnedProduct(supplierId, productId, 'supplierId images');
  await product.deleteOne();
  invalidateProductIndex();
  await removeStoredImages(product.images);
  return { message: 'Product deleted' };
};

const listMyProducts = async (supplierId) => {
  return Product.find({ supplierId }).sort({ createdAt: -1 }).lean();
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

// Only images we stored ourselves are ever deleted — external seed URLs are
// left alone. Legacy '/uploads/' files are removed from disk; current ones
// from the database.
const removeStoredImages = async (imagePaths = []) => {
  await Promise.all(
    imagePaths.map((p) => {
      if (isStoredImage(p)) return deleteImage(p).catch(() => {});
      if (typeof p === 'string' && p.startsWith('/uploads/')) {
        return fs.unlink(path.join(UPLOAD_DIR, path.basename(p))).catch(() => {});
      }
      return null;
    })
  );
};

const addProductImages = async (supplierId, productId, files) => {
  const product = await findOwnedProduct(supplierId, productId);
  if (product.images.length + files.length > MAX_IMAGES) {
    throw httpError(400, `A product can have at most ${MAX_IMAGES} images`);
  }

  const stored = [];
  try {
    // One at a time keeps memory flat while large photos are re-encoded.
    for (const file of files) {
      stored.push(await saveImage(file.buffer, { ownerId: supplierId }));
    }
    product.images.push(...stored);
    await product.save();
  } catch (error) {
    // Never leave orphaned images behind when the request fails part-way.
    await removeStoredImages(stored);
    throw error;
  }

  const saved = product.toObject();
  delete saved.embeddingVector;
  return saved;
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
  UNITS,
};
