const OpenAI = require('openai');

// Any OpenAI-compatible chat API works: Groq's free tier, the Hugging Face
// router, Gemini's compatibility endpoint and so on. The model name comes
// from LLM_MODEL because providers rename and retire models.
// The HF_* variables remain as fallbacks for older deployments.
const LLM_BASE_URL = process.env.LLM_BASE_URL || 'https://router.huggingface.co/v1';
const LLM_API_KEY = process.env.LLM_API_KEY || process.env.HF_TOKEN;
const LLM_MODEL = process.env.LLM_MODEL || process.env.HF_CHAT_MODEL;

if (!LLM_API_KEY || !LLM_MODEL) {
  console.warn('LLM_API_KEY or LLM_MODEL is not set — the assistant will answer with keyword results only.');
}

// A hung or rate-limited call should fail fast so the assistant can fall back
// instead of keeping the buyer waiting. A missing key must not stop the
// marketplace from booting; calls just fail and the service layer falls back.
const llmClient = new OpenAI({
  apiKey: LLM_API_KEY || 'not-configured',
  baseURL: LLM_BASE_URL,
  timeout: 25_000,
  maxRetries: 0,
});

module.exports = { llmClient, LLM_MODEL };
