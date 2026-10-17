// Runs before each test file. Tests never use real credentials or call real
// model APIs: every outbound fetch fails unless a test installs a handler
// with mockFetch() from helpers.js.
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-only-jwt-secret';
process.env.LLM_API_KEY = 'test-llm-key';
process.env.LLM_MODEL = 'test/chat-model';
process.env.HF_TOKEN = 'test-token';
process.env.HF_EMBEDDING_MODEL = 'test/embedding-model';
// Suites exercise the hosted-API code path through mocked fetch; the local
// model provider has its own suite with Transformers.js mocked.
process.env.EMBEDDING_PROVIDER = 'huggingface';
for (const key of ['HF_EMBEDDING_DIM', 'EMBEDDING_DIM', 'LLM_BASE_URL', 'CLIENT_ORIGIN']) {
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
