/**
 * Generates embedding vectors for products that don't have one — typically
 * products saved while the embedding model was unavailable. Without a vector
 * a product never appears in semantic search or similar-product suggestions.
 *
 * Run from the server/ directory:
 *   npm run backfill:embeddings -- --dry-run   (list what would be embedded)
 *   npm run backfill:embeddings                (only products missing a vector)
 *   npm run backfill:embeddings -- --all       (re-embed every product)
 *
 * Use --all after changing EMBEDDING_PROVIDER or the model, so every stored
 * vector comes from the same model as the search queries. Safe to re-run.
 */

require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const Product = require('../models/Product');
const { generateEmbedding, EMBEDDING_PROVIDER } = require('../modules/ai/ai.service');
const { embeddingTextFor, MISSING_EMBEDDING } = require('../modules/products/product.service');

const dryRun = process.argv.includes('--dry-run');
const all = process.argv.includes('--all');

async function run() {
  await connectDB();
  const products = await Product.find(all ? {} : MISSING_EMBEDDING).select('name category description tags').lean();
  const scope = all ? 'to re-embed' : 'have no embedding';
  console.log(`${products.length} product(s) ${scope} with the ${EMBEDDING_PROVIDER} model${dryRun ? ' (dry run)' : ''}\n`);

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
