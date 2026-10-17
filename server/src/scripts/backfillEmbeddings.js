/**
 * Generates embedding vectors for products that don't have one — typically
 * products saved while the Hugging Face API was unavailable. Without a vector
 * a product never appears in semantic search or similar-product suggestions.
 *
 * Run from the server/ directory:
 *   npm run backfill:embeddings -- --dry-run   (list what would be embedded)
 *   npm run backfill:embeddings
 *
 * Safe to re-run: only products still missing a vector are touched.
 */

require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const Product = require('../models/Product');
const { generateEmbedding } = require('../modules/ai/ai.service');
const { embeddingTextFor, MISSING_EMBEDDING } = require('../modules/products/product.service');

const dryRun = process.argv.includes('--dry-run');

async function run() {
  await connectDB();
  const products = await Product.find(MISSING_EMBEDDING).select('name category description tags').lean();
  console.log(`${products.length} product(s) have no embedding${dryRun ? ' (dry run)' : ''}\n`);

  let embedded = 0;
  let failed = 0;
  for (const product of products) {
    if (dryRun) {
      console.log(`  would embed  ${product.name}`);
      continue;
    }
    try {
      const vector = await generateEmbedding(embeddingTextFor(product));
      await Product.updateOne({ _id: product._id }, { $set: { embeddingVector: vector } });
      embedded += 1;
      console.log(`  embedded     ${product.name}`);
    } catch (error) {
      failed += 1;
      console.log(`  failed       ${product.name} — ${error.message}`);
    }
  }

  if (!dryRun) console.log(`\nEmbedded ${embedded}; ${failed} failed (re-run later to retry).`);
  await mongoose.disconnect();
  process.exitCode = failed > 0 ? 1 : 0;
}

run().catch((err) => {
  console.error('Backfill failed:', err);
  process.exit(1);
});
