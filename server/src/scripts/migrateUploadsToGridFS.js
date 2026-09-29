/**
 * Moves product images from the legacy on-disk uploads folder into MongoDB
 * (GridFS), rewriting each product's '/uploads/...' path to '/api/images/...'.
 *
 * Run from the server/ directory on a machine that has the files:
 *   node src/scripts/migrateUploadsToGridFS.js --dry-run   (preview only)
 *   node src/scripts/migrateUploadsToGridFS.js
 *
 * Safe to re-run: only '/uploads/' paths are touched, and a missing file is
 * reported and left as-is rather than removed.
 */

require('dotenv').config();
const fs = require('fs/promises');
const path = require('path');
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const Product = require('../models/Product');
const { saveImage } = require('../utils/imageStore');
const { UPLOAD_DIR } = require('../middleware/upload.middleware');

const dryRun = process.argv.includes('--dry-run');

async function run() {
  await connectDB();
  const products = await Product.find({ images: { $regex: '^/uploads/' } }).select('name images supplierId');
  console.log(`${products.length} product(s) still reference files in /uploads${dryRun ? ' (dry run)' : ''}\n`);

  let moved = 0;
  let missing = 0;
  for (const product of products) {
    const images = [];
    for (const image of product.images) {
      if (!image.startsWith('/uploads/')) {
        images.push(image);
        continue;
      }
      const file = path.join(UPLOAD_DIR, path.basename(image));
      const buffer = await fs.readFile(file).catch(() => null);
      if (!buffer) {
        console.log(`  missing  ${image}  (${product.name}) — left unchanged`);
        missing += 1;
        images.push(image);
        continue;
      }
      const stored = dryRun ? '(would store)' : await saveImage(buffer, { ownerId: product.supplierId.toString() });
      console.log(`  moved    ${image} -> ${stored}  (${product.name})`);
      moved += 1;
      images.push(stored);
    }
    if (!dryRun) await Product.updateOne({ _id: product._id }, { $set: { images } });
  }

  console.log(`\n${dryRun ? 'Would move' : 'Moved'} ${moved} image(s); ${missing} missing file(s).`);
  await mongoose.disconnect();
}

run().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
