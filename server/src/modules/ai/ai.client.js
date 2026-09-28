const OpenAI = require('openai');

if (!process.env.HF_TOKEN) {
  console.warn('HF_TOKEN is not set — AI features will respond as unavailable.');
}

// A hung inference call should fail fast rather than tie up the request.
// A missing token must not stop the marketplace from booting; AI calls just fail
// and the service layer turns that into a friendly 503.
const hfClient = new OpenAI({
  apiKey: process.env.HF_TOKEN || 'not-configured',
  baseURL: 'https://router.huggingface.co/v1',
  timeout: 25_000,
  maxRetries: 1,
});

module.exports = hfClient;
