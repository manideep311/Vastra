const OpenAI = require('openai');

// Chat runs on Groq's free tier by default. Any OpenAI-compatible API works
// (set LLM_BASE_URL), and the model name comes from LLM_MODEL because
// providers rename and retire models.
const LLM_BASE_URL = process.env.LLM_BASE_URL || 'https://api.groq.com/openai/v1';
const LLM_API_KEY = process.env.LLM_API_KEY;
const LLM_MODEL = process.env.LLM_MODEL;

// Reasoning models (e.g. gpt-oss on Groq) spend part of max_completion_tokens
// thinking. On Groq they default to low effort with the reasoning hidden from
// the reply; other providers get neither unless configured. "off" omits one.
const isGroq = LLM_BASE_URL.includes('api.groq.com');
const reasoningOption = (value, groqDefault) => {
  const setting = (value ?? (isGroq ? groqDefault : '')).trim();
  return setting && setting !== 'off' ? setting : undefined;
};
const LLM_REQUEST_OPTIONS = Object.fromEntries(
  Object.entries({
    reasoning_effort: reasoningOption(process.env.LLM_REASONING_EFFORT, 'low'),
    reasoning_format: reasoningOption(process.env.LLM_REASONING_FORMAT, 'hidden'),
  }).filter(([, value]) => value !== undefined)
);

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

module.exports = { llmClient, LLM_MODEL, LLM_REQUEST_OPTIONS };
