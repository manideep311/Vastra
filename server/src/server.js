require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');
const routes = require('./routes');
const errorHandler = require('./middleware/errorHandler');

const app = express();

// Global middleware
app.use(cors());
app.use(express.json()); // parses incoming JSON request bodies

// Health-check route — confirms the server is alive
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Mount all API routes under /api
app.use('/api', routes);

// Centralized error handler — must be registered last
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
});

app.use('/uploads', express.static('uploads'));