const mongoose = require('mongoose');
const SupplierProfile = require('../../models/SupplierProfile');
const User = require('../../models/User');
const Product = require('../../models/Product');
const Order = require('../../models/Order');
const Quote = require('../../models/Quote');
const { httpError, requireString, optionalString, optionalNumber, stringList } = require('../../utils/validate');

// The only profile fields a supplier may set themselves. Trust signals
// (isVerified, verificationBadge, ratings, completedOrders) are system-managed
// and deliberately absent — they're shown publicly to buyers.
const sanitizeProfileInput = (data = {}, { partial = false } = {}) => {
  const has = (key) => data[key] !== undefined;
  const out = {};
  if (!partial || has('businessName')) out.businessName = requireString(data.businessName, 'Business name', { max: 120 });
  if (has('businessType')) out.businessType = optionalString(data.businessType, 'Business type', { max: 60 });
  if (has('businessAddress')) out.businessAddress = optionalString(data.businessAddress, 'Business address', { max: 500 });
  if (has('operatingHours')) out.operatingHours = optionalString(data.operatingHours, 'Operating hours', { max: 60 });
  if (has('about')) out.about = optionalString(data.about, 'About', { max: 1000 });
  if (has('moq')) out.moq = optionalNumber(data.moq, 'MOQ', { min: 0, max: 1_000_000 });
  if (has('productCategories')) out.productCategories = stringList(data.productCategories, 'Product categories');
  if (has('fabricTypesOffered')) out.fabricTypesOffered = stringList(data.fabricTypesOffered, 'Fabric types');
  if (has('contactInfo')) {
    const contact = data.contactInfo || {};
    out.contactInfo = {
      phone: optionalString(contact.phone, 'Phone', { max: 30 }),
      email: optionalString(contact.email, 'Contact email', { max: 254 }),
    };
  }
  if (has('logoUrl')) {
    const logoUrl = optionalString(data.logoUrl, 'Logo URL', { max: 500 });
    if (logoUrl && !logoUrl.startsWith('https://') && !logoUrl.startsWith('/uploads/')) throw httpError(400, 'Logo must be an https URL');
    out.logoUrl = logoUrl;
  }
  return out;
};

const getDashboard = async (supplierId) => {
  const LOW_STOCK_THRESHOLD = 20;
  const THIRTY_DAYS_AGO = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const supplierObjectId = new mongoose.Types.ObjectId(supplierId);

  const [
    totalProducts,
    activeProducts,
    pendingOrders,
    recentOrders,
    lowStockProducts,
    salesOverTime,
    topProducts,
    pendingQuotes,
  ] = await Promise.all([
    Product.countDocuments({ supplierId }),
    Product.countDocuments({ supplierId, status: 'available' }),
    Order.countDocuments({ supplierId, status: 'pending' }),
    Order.find({ supplierId }).select('total status createdAt items.name').sort({ createdAt: -1 }).limit(5).lean(),
    Product.find({ supplierId, stock: { $lte: LOW_STOCK_THRESHOLD } }).select('name stock status unit').sort({ stock: 1 }).limit(10).lean(),
    Order.aggregate([
      { $match: { supplierId: supplierObjectId, createdAt: { $gte: THIRTY_DAYS_AGO } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          revenue: { $sum: '$total' },
          orders: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]),
    Order.aggregate([
      { $match: { supplierId: supplierObjectId } },
      { $unwind: '$items' },
      { $group: { _id: '$items.name', unitsSold: { $sum: '$items.quantity' }, revenue: { $sum: { $multiply: ['$items.price', '$items.quantity'] } } } },
      { $sort: { unitsSold: -1 } },
      { $limit: 5 },
    ]),
    Quote.countDocuments({ supplierId, status: 'pending' }),
  ]);

  return {
    totalProducts,
    activeProducts,
    pendingOrders,
    pendingQuotes,
    recentOrders,
    inventoryAlerts: lowStockProducts,
    salesOverTime: salesOverTime.map((d) => ({ date: d._id, revenue: d.revenue, orders: d.orders })),
    topProducts: topProducts.map((p) => ({ name: p._id, unitsSold: p.unitsSold, revenue: p.revenue })),
  };
};

// Public storefront view — no auth required, safe subset of fields only.
const getPublicProfile = async (supplierId) => {
  const [profile, productCount, products] = await Promise.all([
    SupplierProfile.findOne({ userId: supplierId }).select(
      'businessName businessType businessAddress operatingHours productCategories fabricTypesOffered moq isVerified verificationBadge ratingAverage ratingCount completedOrders about logoUrl'
    ),
    Product.countDocuments({ supplierId, status: 'available' }),
    Product.find({ supplierId, status: 'available' }).sort({ createdAt: -1 }).limit(12).lean(),
  ]);
  if (!profile) {
    const error = new Error('Supplier not found');
    error.statusCode = 404;
    throw error;
  }
  return { profile, productCount, products };
};

const completeOnboarding = async (userId, data) => {
  const profile = await SupplierProfile.findOneAndUpdate(
    { userId },
    sanitizeProfileInput(data),
    { returnDocument: 'after', upsert: true, runValidators: true }
  );

  await User.findByIdAndUpdate(userId, { onboardingComplete: true });

  return profile;
};

const getProfile = async (userId) => {
  const profile = await SupplierProfile.findOne({ userId });
  if (!profile) {
    const error = new Error('Supplier profile not found');
    error.statusCode = 404;
    throw error;
  }
  return profile;
};

const updateProfile = async (userId, data) => {
  const profile = await SupplierProfile.findOneAndUpdate({ userId }, sanitizeProfileInput(data, { partial: true }), {
    returnDocument: 'after',
    runValidators: true,
  });
  if (!profile) {
    const error = new Error('Supplier profile not found');
    error.statusCode = 404;
    throw error;
  }
  return profile;
};

module.exports = { completeOnboarding, getProfile, updateProfile, getDashboard, getPublicProfile };