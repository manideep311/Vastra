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
const { EMBEDDING_PROVIDER } = require('./modules/ai/ai.service');
const { loadExtractor } = require('./modules/ai/localEmbedder');

const PORT = process.env.PORT || 5000;

const rssMb = () => Math.round(process.memoryUsage().rss / 1024 / 1024);

connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT} (memory ${rssMb()} MB)`);
  });

  // Load the embedding model now rather than on the first search. Failure is
  // logged only: searches fall back to keywords until the model loads.
  if (EMBEDDING_PROVIDER === 'local') {
    loadExtractor()
      .then(() => console.log(`Embedding model ready (memory ${rssMb()} MB)`))
      .catch((error) => console.error('Embedding model failed to load:', error.message));
  }
});
