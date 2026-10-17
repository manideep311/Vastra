// The local provider runs Transformers.js in-process. The library is mocked
// here so the suite stays fast and offline; the real model is exercised by
// `npm run model:download` and `npm run eval:assistant`.
process.env.EMBEDDING_PROVIDER = 'local';

const mockExtractor = jest.fn();
const mockPipeline = jest.fn();

jest.mock('@huggingface/transformers', () => ({ env: {}, pipeline: mockPipeline }));

const { generateEmbedding, EmbeddingError, EMBEDDING_PROVIDER } = require('../src/modules/ai/ai.service');

beforeEach(() => {
  mockExtractor.mockReset();
  mockPipeline.mockReset();
  mockPipeline.mockResolvedValue(mockExtractor);
});

describe('local embedding provider', () => {
  test('is the default provider', () => {
    expect(EMBEDDING_PROVIDER).toBe('local');
  });

  test('mean-pools and normalises with the quantized model', async () => {
    mockExtractor.mockResolvedValue({ data: Float32Array.from([0.6, 0.8, 0]) });

    const vector = await generateEmbedding('organic cotton twill');

    expect(mockPipeline).toHaveBeenCalledWith('feature-extraction', 'Xenova/all-MiniLM-L6-v2', { dtype: 'q8' });
    expect(mockExtractor).toHaveBeenCalledWith('organic cotton twill', { pooling: 'mean', normalize: true });
    expect(Array.isArray(vector)).toBe(true);
    expect(vector[0]).toBeCloseTo(0.6);
    expect(vector[1]).toBeCloseTo(0.8);
  });

  test('wraps model failures in an EmbeddingError and retries the load next time', async () => {
    mockPipeline.mockRejectedValueOnce(new Error('model file missing'));
    await expect(generateEmbedding('first attempt')).rejects.toBeInstanceOf(EmbeddingError);

    mockExtractor.mockResolvedValue({ data: Float32Array.from([1, 0, 0]) });
    await expect(generateEmbedding('second attempt')).resolves.toHaveLength(3);
  });

  test('rejects a vector containing non-finite numbers', async () => {
    mockExtractor.mockResolvedValue({ data: Float32Array.from([NaN, 1, 0]) });
    await expect(generateEmbedding('broken output')).rejects.toBeInstanceOf(EmbeddingError);
  });
});
