const fs = require('fs');
const path = require('path');

// Runs the sentence-embedding model inside this process with Transformers.js
// (ONNX Runtime), so embeddings need no API key and have no usage limits.
// The model files live in server/.models: `npm run model:download` fetches
// them at build time so a cold server doesn't download on its first search.

const MODEL_ID = process.env.LOCAL_EMBEDDING_MODEL || 'Xenova/all-MiniLM-L6-v2';
const MODEL_DIR = path.join(__dirname, '../../../.models');
const DTYPE = 'q8'; // 8-bit quantized weights: ~23 MB on disk

let extractorPromise = null;

const isModelDownloaded = () => fs.existsSync(path.join(MODEL_DIR, MODEL_ID, 'onnx'));

// Loaded at startup (or on first use) and shared afterwards. A failed load is
// not cached, so the next request tries again.
const loadExtractor = ({ downloading = false } = {}) => {
  if (!extractorPromise) {
    extractorPromise = (async () => {
      const { pipeline, env } = require('@huggingface/transformers');
      env.cacheDir = MODEL_DIR;
      if (!downloading && !isModelDownloaded()) {
        console.warn(`Embedding model ${MODEL_ID} is not in ${MODEL_DIR}; downloading it now. Run "npm run model:download" at build time to avoid this.`);
      }
      return pipeline('feature-extraction', MODEL_ID, { dtype: DTYPE });
    })().catch((error) => {
      extractorPromise = null;
      throw error;
    });
  }
  return extractorPromise;
};

// Mean-pooled, L2-normalised sentence vector — the standard recipe for
// sentence-transformers models such as all-MiniLM-L6-v2.
const embedLocally = async (text) => {
  const extractor = await loadExtractor();
  const output = await extractor(text, { pooling: 'mean', normalize: true });
  return Array.from(output.data);
};

module.exports = { MODEL_ID, MODEL_DIR, isModelDownloaded, loadExtractor, embedLocally };
