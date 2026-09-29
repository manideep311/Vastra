const multer = require('multer');
const path = require('path');

// Explicit allow-list: SVG (which can carry script) and any other image/*
// type are rejected. Files are held in memory only long enough to be
// validated, resized and stored in MongoDB (see utils/imageStore.js).
const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);

// Legacy on-disk uploads from before images moved to the database; still
// served read-only so older listings keep working.
const UPLOAD_DIR = path.join(__dirname, '../../uploads');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 5 }, // 5MB per file, 5 files per request
  fileFilter: (req, file, cb) => {
    if (ALLOWED_TYPES.has(file.mimetype)) {
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
