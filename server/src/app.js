// The Express application: middleware, routes and error handling. It does
// not connect to MongoDB or listen on a port, so tests can import it directly
// (see server.js for startup).
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const routes = require('./routes');
const errorHandler = require('./middleware/errorHandler');
const { apiLimiter } = require('./middleware/rateLimit');
const { UPLOAD_DIR } = require('./middleware/upload.middleware');
const imageRoutes = require('./modules/images/image.routes');

const app = express();

// Behind a hosting proxy (Render/Railway/etc.) the client IP arrives in
// X-Forwarded-For; rate limiting needs the real IP, not the proxy's.
if (process.env.TRUST_PROXY) app.set('trust proxy', Number(process.env.TRUST_PROXY) || 1);

// CLIENT_ORIGIN is a comma-separated allow-list, e.g. "https://vastra.app".
// Unset in development, any origin is accepted so local ports just work
// (server.js refuses to start in production without it).
const allowedOrigins = (process.env.CLIENT_ORIGIN || '')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

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

// Product images are immutable, cacheable static content — served ahead of the
// API rate limiter so a page full of thumbnails doesn't use up a visitor's budget.
app.use('/api/images', imageRoutes);

app.use('/api', apiLimiter, routes);

app.use('/api', (req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Centralized error handler — must be registered last
app.use(errorHandler);

module.exports = app;
