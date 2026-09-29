const express = require('express');
const { findImage, openImageStream } = require('../../utils/imageStore');

const router = express.Router();

// GET /api/images/:key            -> full-size WebP (up to 1600px)
// GET /api/images/:key?size=thumb -> card WebP (up to 640px)
// GET /api/images/:key?size=small -> list-row WebP (up to 240px)
// Keys are random and never reused, so responses are cached for a year.
router.get('/:key', async (req, res, next) => {
  try {
    const variant = ['thumb', 'small'].includes(req.query.size) ? req.query.size : 'full';
    const file = await findImage(req.params.key, variant);
    if (!file) return res.status(404).json({ error: 'Image not found' });

    if (req.headers['if-none-match'] === `"${file._id}"`) return res.status(304).end();

    res.set({
      'Content-Type': 'image/webp',
      'Content-Length': file.length,
      'Cache-Control': 'public, max-age=31536000, immutable',
      ETag: `"${file._id}"`,
      'Content-Security-Policy': "default-src 'none'",
    });
    openImageStream(file)
      .once('error', (error) => (res.headersSent ? res.destroy(error) : next(error)))
      .pipe(res);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
