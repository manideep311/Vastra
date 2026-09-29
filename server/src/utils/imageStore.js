const crypto = require('crypto');
const mongoose = require('mongoose');
const sharp = require('sharp');
const { httpError } = require('./validate');

// Product images live in MongoDB (GridFS) rather than on the server's disk:
// hosts like Render wipe the local filesystem on every restart and redeploy,
// which made uploaded photos disappear. Each upload is normalised into three
// WebP sizes so lists never download a full-size photo for a thumbnail.
const BUCKET = 'productImages';
const VARIANTS = {
  full: { size: 1600, quality: 82 }, // product page
  thumb: { size: 640, quality: 78 }, // cards and grids
  small: { size: 240, quality: 75 }, // list rows, cart, quotes
};
const PUBLIC_PREFIX = '/api/images/';
const KEY_PATTERN = /^[a-f0-9]{24}$/;

const bucket = () => new mongoose.mongo.GridFSBucket(mongoose.connection.db, { bucketName: BUCKET });

const filenameFor = (key, variant) => `${key}-${variant}.webp`;

const writeFile = (filename, buffer, metadata) =>
  new Promise((resolve, reject) => {
    const stream = bucket().openUploadStream(filename, { metadata: { ...metadata, contentType: 'image/webp' } });
    stream.once('finish', resolve).once('error', reject);
    stream.end(buffer);
  });

// Re-encoding through sharp also proves the bytes really are an image —
// a renamed script or corrupt file fails here, whatever its MIME type claimed.
const saveImage = async (buffer, { ownerId } = {}) => {
  try {
    await sharp(buffer, { failOn: 'error' }).metadata();
  } catch {
    throw httpError(400, "One of the files isn't a readable image");
  }

  const key = crypto.randomBytes(12).toString('hex');
  const encoded = await Promise.all(
    Object.entries(VARIANTS).map(async ([variant, { size, quality }]) => [
      variant,
      await sharp(buffer)
        .rotate() // honour camera orientation
        .resize({ width: size, height: size, fit: 'inside', withoutEnlargement: true })
        .webp({ quality })
        .toBuffer(),
    ])
  );
  await Promise.all(encoded.map(([variant, data]) => writeFile(filenameFor(key, variant), data, { key, variant, ownerId })));
  return `${PUBLIC_PREFIX}${key}`;
};

const isStoredImage = (path) => typeof path === 'string' && path.startsWith(PUBLIC_PREFIX);

const findImage = async (key, variant) => {
  if (!KEY_PATTERN.test(key) || !VARIANTS[variant]) return null;
  const [file] = await bucket().find({ filename: filenameFor(key, variant) }).limit(1).toArray();
  return file || null;
};

const openImageStream = (file) => bucket().openDownloadStream(file._id);

const deleteImage = async (path) => {
  if (!isStoredImage(path)) return;
  const key = path.slice(PUBLIC_PREFIX.length);
  const files = await bucket()
    .find({ filename: { $in: Object.keys(VARIANTS).map((v) => filenameFor(key, v)) } })
    .toArray();
  await Promise.all(files.map((f) => bucket().delete(f._id).catch(() => {})));
};

module.exports = { saveImage, deleteImage, findImage, openImageStream, isStoredImage };
