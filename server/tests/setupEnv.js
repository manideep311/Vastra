// Runs before each test file. Tests never use real credentials or call the
// real Hugging Face API: every outbound fetch fails unless a test installs a
// handler with mockFetch() from helpers.js.
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-only-jwt-secret';
process.env.HF_TOKEN = 'test-token';
process.env.HF_CHAT_MODEL = 'test/chat-model';
process.env.HF_EMBEDDING_MODEL = 'test/embedding-model';
for (const key of ['HF_EMBEDDING_DIM', 'LLM_BASE_URL', 'LLM_API_KEY', 'LLM_MODEL', 'CLIENT_ORIGIN']) {
  delete process.env[key];
}

const offline = async (url) => {
  throw new Error(`Network access is disabled in tests (${url})`);
};

// fetch stays the same function for the whole run (an SDK may keep a
// reference to it); tests swap the handler behind it instead.
globalThis.__fetchHandler = offline;
globalThis.__offlineFetch = offline;
global.fetch = (url, options) => globalThis.__fetchHandler(String(url), options);
