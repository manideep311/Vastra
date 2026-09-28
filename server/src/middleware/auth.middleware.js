const jwt = require('jsonwebtoken');

const readBearerToken = (req) => {
  const authHeader = req.headers.authorization; // expected format: "Bearer <token>"
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  return authHeader.slice(7).trim() || null;
};

const verifyToken = (token) => {
  const decoded = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] });
  if (!decoded?.userId || !['buyer', 'supplier'].includes(decoded.role)) {
    throw new Error('Malformed token payload');
  }
  return decoded;
};

// Verifies the JWT and attaches { userId, role } to req.user
const authenticate = (req, res, next) => {
  const token = readBearerToken(req);
  if (!token) {
    return res.status(401).json({ error: 'Please sign in to continue' });
  }

  try {
    req.user = verifyToken(token); // { userId, role, iat, exp }
    next();
  } catch {
    return res.status(401).json({ error: 'Your session has expired. Please sign in again.' });
  }
};

// For public routes that behave slightly differently for signed-in users
// (e.g. higher AI rate limits). A bad token is simply ignored here — the
// route stays usable as a guest.
const optionalAuthenticate = (req, res, next) => {
  const token = readBearerToken(req);
  if (token) {
    try {
      req.user = verifyToken(token);
    } catch {
      req.user = undefined;
    }
  }
  next();
};

// Restricts access to a specific role — use AFTER authenticate
const authorize = (requiredRole) => {
  return (req, res, next) => {
    if (req.user.role !== requiredRole) {
      return res.status(403).json({ error: 'Access denied for this role' });
    }
    next();
  };
};

module.exports = { authenticate, optionalAuthenticate, authorize };
