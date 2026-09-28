const multer = require('multer');
const path = require('path');
const crypto = require('crypto');

// Explicit allow-list: SVG (which can carry script) and any other image/*
// type are rejected. The stored extension is derived from the MIME type,
// never from the client-supplied filename.
const ALLOWED_TYPES = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',
};

const UPLOAD_DIR = path.join(__dirname, '../../uploads');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOAD_DIR);
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${crypto.randomBytes(6).toString('hex')}${ALLOWED_TYPES[file.mimetype]}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024, files: 5 }, // 5MB per file, 5 files per request
  fileFilter: (req, file, cb) => {
    if (ALLOWED_TYPES[file.mimetype]) {
      cb(null, true);
    } else {
      const error = new Error('Only JPG, PNG, WebP or GIF images are allowed');
      error.statusCode = 400;
      cb(error);
    }
  },
});

module.exports = upload;
module.exports.UPLOAD_DIR = UPLOAD_DIR;
