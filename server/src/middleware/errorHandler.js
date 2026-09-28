const multer = require('multer');

// Maps known error types to clean client-facing responses. Anything
// unexpected becomes a generic 500 — the full error is logged server-side
// only, so stack traces and driver/library wording never reach the client.
// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'Malformed JSON body' });
  }
  if (err.type === 'entity.too.large') {
    return res.status(413).json({ error: 'Request body is too large' });
  }
  if (err.statusCode && err.statusCode < 500) {
    return res.status(err.statusCode).json({ error: err.message });
  }
  if (err.name === 'CastError') {
    return res.status(400).json({ error: `Invalid ${err.path || 'value'}` });
  }
  if (err.name === 'ValidationError') {
    const fields = Object.keys(err.errors || {});
    return res.status(400).json({ error: fields.length ? `Invalid value for: ${fields.join(', ')}` : 'Invalid input' });
  }
  if (err.code === 11000) {
    return res.status(409).json({ error: 'That record already exists' });
  }
  if (err instanceof multer.MulterError) {
    const message = err.code === 'LIMIT_FILE_SIZE' ? 'Each image must be 5MB or smaller' : 'Image upload failed';
    return res.status(400).json({ error: message });
  }

  console.error(err);
  res.status(err.statusCode || 500).json({ error: 'Something went wrong. Please try again.' });
};

module.exports = errorHandler;
