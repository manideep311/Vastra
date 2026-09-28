require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const connectDB = require('./config/db');
const routes = require('./routes');
const errorHandler = require('./middleware/errorHandler');
const { apiLimiter } = require('./middleware/rateLimit');
const { UPLOAD_DIR } = require('./middleware/upload.middleware');

if (!process.env.JWT_SECRET) {
  console.error('JWT_SECRET is not set — refusing to start.');
  process.exit(1);
}

const app = express();
const isProduction = process.env.NODE_ENV === 'production';

// Behind a hosting proxy (Render/Railway/etc.) the client IP arrives in
// X-Forwarded-For; rate limiting needs the real IP, not the proxy's.
if (process.env.TRUST_PROXY) app.set('trust proxy', Number(process.env.TRUST_PROXY) || 1);

// CLIENT_ORIGIN is a comma-separated allow-list, e.g. "https://vastra.app".
// Unset in development, any origin is accepted so local ports just work.
const allowedOrigins = (process.env.CLIENT_ORIGIN || '')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

if (isProduction && allowedOrigins.length === 0) {
  console.warn('CLIENT_ORIGIN is not set — CORS will allow any origin.');
}

app.use(
  helmet({
    // Product images in /uploads are loaded cross-origin by the SPA.
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);
app.use(cors(allowedOrigins.length ? { origin: allowedOrigins } : undefined));
app.use(express.json({ limit: '100kb' }));

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.use(
  '/uploads',
  express.static(UPLOAD_DIR, {
    maxAge: '7d',
    immutable: true, // filenames are unique per upload, so they never change
    setHeaders: (res) => res.setHeader('Content-Security-Policy', "default-src 'none'"),
  })
);

app.use('/api', apiLimiter, routes);

app.use('/api', (req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Centralized error handler — must be registered last
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
});
