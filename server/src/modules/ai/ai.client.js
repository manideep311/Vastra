const OpenAI = require('openai');

const hfClient = new OpenAI({
  apiKey: process.env.HF_TOKEN,
  baseURL: 'https://router.huggingface.co/v1',
});

module.exports = hfClient;