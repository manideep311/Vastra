const express = require('express');
const authRoutes = require('../modules/auth/auth.routes');
const buyerRoutes = require('../modules/buyers/buyer.routes');
const productRoutes = require('../modules/products/product.routes');
const cartRoutes = require('../modules/cart/cart.routes');
const orderRoutes = require('../modules/orders/order.routes');
const supplierRoutes = require('../modules/suppliers/supplier.routes');
const supplierPublicRoutes = require('../modules/suppliers/supplierPublic.routes');
const aiRoutes = require('../modules/ai/ai.routes');
const quoteRoutes = require('../modules/quotes/quote.routes');
const wishlistRoutes = require('../modules/wishlist/wishlist.routes');
const reviewRoutes = require('../modules/reviews/review.routes');
const notificationRoutes = require('../modules/notifications/notification.routes');
const sampleRoutes = require('../modules/samples/sample.routes');
const categoryRoutes = require('../modules/categories/category.routes');

const router = express.Router();

router.use('/auth', authRoutes);
router.use('/buyer', buyerRoutes);
router.use('/products', productRoutes);
router.use('/cart', cartRoutes);
router.use('/orders', orderRoutes);
router.use('/supplier', supplierRoutes);
router.use('/suppliers', supplierPublicRoutes); // public directory — plural, unauthenticated
router.use('/ai', aiRoutes);

// --- Extensible B2B SaaS modules ---
router.use('/quotes', quoteRoutes);
router.use('/wishlist', wishlistRoutes);
router.use('/reviews', reviewRoutes);
router.use('/notifications', notificationRoutes);
router.use('/samples', sampleRoutes);
router.use('/categories', categoryRoutes);

module.exports = router;