/**
 * Clears the minimum order quantity for a specific set of products, so
 * buyers can order any amount (MOQ enforcement treats moq <= 1 as "no
 * minimum" — see server/src/modules/cart/cart.service.js).
 *
 * Run from the server/ directory:
 *   node src/scripts/removeMoq.js
 */

require('dotenv').config();
const connectDB = require('../config/db');
const Product = require('../models/Product');

const PRODUCT_IDS = [
  '6a720cccac383c9c0c6960a9', // Poly-Cotton Blend Workwear Fabric
  '6a720cccac383c9c0c6960a8', // Water-Resistant Polyester Taffeta
  '6a720ccbac383c9c0c6960a5', // Linen-Cotton Blend Upholstery Fabric
  '6a720ccbac383c9c0c6960a4', // Pure European Flax Linen
  '6a720cc9ac383c9c0c696099', // Kanchipuram Handloom Silk Brocade
  '6a720cc9ac383c9c0c696098', // Pure Mulberry Silk Satin
  '6a720cc8ac383c9c0c696095', // GOTS Certified Organic Cotton Twill
];

async function run() {
  await connectDB();

  const before = await Product.find({ _id: { $in: PRODUCT_IDS } }, 'name moq');
  console.log(`Found ${before.length}/${PRODUCT_IDS.length} products:`);
  before.forEach((p) => console.log(`  ${p._id}  moq=${p.moq}  ${p.name}`));

  const result = await Product.updateMany({ _id: { $in: PRODUCT_IDS } }, { $set: { moq: 1 } });
  console.log(`\nMatched ${result.matchedCount}, modified ${result.modifiedCount}.`);

  const after = await Product.find({ _id: { $in: PRODUCT_IDS } }, 'name moq');
  console.log('\nAfter:');
  after.forEach((p) => console.log(`  ${p._id}  moq=${p.moq}  ${p.name}`));

  process.exit(0);
}

run().catch((err) => {
  console.error('Failed to clear MOQ:', err);
  process.exit(1);
});
