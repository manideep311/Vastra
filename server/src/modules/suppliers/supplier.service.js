const mongoose = require('mongoose');
const SupplierProfile = require('../../models/SupplierProfile');
const User = require('../../models/User');
const Product = require('../../models/Product');
const Order = require('../../models/Order');

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
  ] = await Promise.all([
    Product.countDocuments({ supplierId }),
    Product.countDocuments({ supplierId, status: 'available' }),
    Order.countDocuments({ supplierId, status: 'pending' }),
    Order.find({ supplierId }).sort({ createdAt: -1 }).limit(5),
    Product.find({ supplierId, stock: { $lte: LOW_STOCK_THRESHOLD } }).select('name stock status'),
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
  ]);

  return {
    totalProducts,
    activeProducts,
    pendingOrders,
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
    Product.find({ supplierId, status: 'available' }).select('-embeddingVector').sort({ createdAt: -1 }).limit(12),
  ]);
  if (!profile) {
    const error = new Error('Supplier not found');
    error.statusCode = 404;
    throw error;
  }
  return { profile, productCount, products };
};

const completeOnboarding = async (userId, data) => {
  const {
    businessName,
    businessType,
    contactInfo,
    businessAddress,
    operatingHours,
    productCategories,
    fabricTypesOffered,
    moq,
  } = data;

  const profile = await SupplierProfile.findOneAndUpdate(
    { userId },
    { businessName, businessType, contactInfo, businessAddress, operatingHours, productCategories, fabricTypesOffered, moq },
    { new: true, upsert: true, runValidators: true }
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
  const profile = await SupplierProfile.findOneAndUpdate({ userId }, data, { new: true, runValidators: true });
  if (!profile) {
    const error = new Error('Supplier profile not found');
    error.statusCode = 404;
    throw error;
  }
  return profile;
};

module.exports = { completeOnboarding, getProfile, updateProfile, getDashboard, getPublicProfile };