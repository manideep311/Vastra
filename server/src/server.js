require('dotenv').config();
const connectDB = require('./config/db');

// Configuration that must be present before the app accepts traffic.
if (!process.env.JWT_SECRET) {
  console.error('JWT_SECRET is not set — refusing to start.');
  process.exit(1);
}

// In production an open CORS policy is never the intent.
if (process.env.NODE_ENV === 'production' && !(process.env.CLIENT_ORIGIN || '').trim()) {
  console.error('CLIENT_ORIGIN is not set — refusing to start in production with an open CORS policy.');
  process.exit(1);
}

const app = require('./app');

const PORT = process.env.PORT || 5000;

connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
});
