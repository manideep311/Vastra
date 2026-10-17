const request = require('supertest');
const app = require('../src/app');
const Product = require('../src/models/Product');
const { generateEmbedding, invalidateProductIndex, EmbeddingError } = require('../src/modules/ai/ai.service');
const { startDb, stopDb, clearDb, createUser, createProduct, mockFetch, resetFetch, jsonResponse } = require('./helpers');

beforeAll(async () => {
  await startDb();
  await Product.init(); // the keyword fallback needs the text index
});
afterAll(stopDb);
afterEach(async () => {
  resetFetch();
  await clearDb();
});

let supplier;
let buyer;

beforeEach(async () => {
  supplier = await createUser('supplier');
  buyer = await createUser('buyer');
  invalidateProductIndex();
});

const isEmbeddingCall = (url) => url.includes('/pipeline/feature-extraction');
const isChatCall = (url) => url.includes('/chat/completions');

// Three-dimensional "embeddings": linen-ish text points one way, denim another.
const fakeVector = (text) => (/linen|breathable/i.test(text) ? [1, 0, 0] : /denim/i.test(text) ? [0, 1, 0] : [0, 0, 1]);

const chatCompletion = (content) =>
  jsonResponse({
    id: 'test',
    object: 'chat.completion',
    created: 0,
    model: 'test',
    choices: [{ index: 0, finish_reason: 'stop', message: { role: 'assistant', content } }],
  });

const seedCatalog = async () => {
  const linen = await createProduct(supplier, { name: 'Washed Linen', category: 'Linen', description: 'Breathable linen.', embeddingVector: [1, 0, 0] });
  const denim = await createProduct(supplier, { name: 'Raw Denim', category: 'Denim', description: 'Heavy denim twill.', embeddingVector: [0, 1, 0] });
  invalidateProductIndex();
  return { linen, denim };
};

describe('semantic search', () => {
  test('ranks products by embedding similarity', async () => {
    await seedCatalog();
    mockFetch(async (url, options) => {
      if (isEmbeddingCall(url)) return jsonResponse(fakeVector(JSON.parse(options.body).inputs));
      throw new Error(`unexpected request ${url}`);
    });

    const res = await request(app).post('/api/ai/search').set(buyer.auth).send({ query: 'something breathable' }).expect(200);
    expect(res.body.results[0].name).toBe('Washed Linen');
    expect(res.body.results[0].embeddingVector).toBeUndefined();
  });

  test('answers 503 with a friendly message when the embedding API is down', async () => {
    await seedCatalog();
    const res = await request(app).post('/api/ai/search').set(buyer.auth).send({ query: 'denim' }).expect(503);
    expect(res.body.error).toMatch(/temporarily unavailable/);
  });
});

describe('assistant fallback', () => {
  test('uses keyword search for context when embeddings fail', async () => {
    await seedCatalog();
    let sentMessages;
    mockFetch(async (url, options) => {
      if (isEmbeddingCall(url)) return jsonResponse({ error: 'Payment required' }, 402);
      if (isChatCall(url)) {
        sentMessages = JSON.parse(options.body).messages;
        return chatCompletion('Washed Linen is a good fit.');
      }
      throw new Error(`unexpected request ${url}`);
    });

    const res = await request(app).post('/api/ai/chat').set(buyer.auth).send({ message: 'linen for summer shirts' }).expect(200);

    expect(res.body.reply).toBe('Washed Linen is a good fit.');
    expect(res.body.referencedProducts.map((p) => p.name)).toContain('Washed Linen');
    // Product data travels in the delimited user turn, never in the system prompt.
    expect(sentMessages[0].role).toBe('system');
    expect(sentMessages[0].content).not.toMatch(/Washed Linen/);
    expect(sentMessages.at(-1).content).toMatch(/<catalog>[\s\S]*Washed Linen[\s\S]*<\/catalog>/);
  });

  test('answers 503 when the chat model is unavailable', async () => {
    await seedCatalog();
    const res = await request(app).post('/api/ai/chat').set(buyer.auth).send({ message: 'linen' }).expect(503);
    expect(res.body.error).toMatch(/temporarily unavailable/);
  });

  test('suppliers can still list products while embeddings are down', async () => {
    const res = await request(app)
      .post('/api/products')
      .set(supplier.auth)
      .send({ name: 'Cotton Voile', category: 'Cotton', price: 80, stock: 200 })
      .expect(201);

    const saved = await Product.findById(res.body.product?._id || res.body._id).select('+embeddingVector').lean();
    expect(saved.name).toBe('Cotton Voile');
    expect(saved.embeddingVector).toBeUndefined();
  });

  test('similar products come from stored vectors without a model call', async () => {
    const { linen } = await seedCatalog();
    await createProduct(supplier, { name: 'Linen Blend', category: 'Linen', embeddingVector: [0.9, 0.1, 0] });
    invalidateProductIndex();

    const res = await request(app).get(`/api/ai/similar/${linen._id}`).expect(200);
    expect(res.body.results[0].name).toBe('Linen Blend');
  });
});

describe('embedding validation', () => {
  test.each([
    ['an error object', { error: 'Model is loading' }],
    ['non-numeric values', ['a', 'b']],
    ['ragged token rows', [[1, 2], [3]]],
  ])('rejects %s with an EmbeddingError', async (_label, body) => {
    mockFetch(async () => jsonResponse(body));
    await expect(generateEmbedding(`validation ${_label}`)).rejects.toBeInstanceOf(EmbeddingError);
  });
});
