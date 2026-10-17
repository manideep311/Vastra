/**
 * Downloads the local embedding model into server/.models so the server never
 * fetches it on a cold start. Run it in the deploy build step, e.g. on Render:
 *   npm ci && npm run model:download
 *
 * It also embeds one sentence to prove the model loads and reports the
 * process memory afterwards.
 */

const { MODEL_ID, MODEL_DIR, isModelDownloaded, loadExtractor, embedLocally } = require('../modules/ai/localEmbedder');

async function run() {
  const alreadyThere = isModelDownloaded();
  const started = Date.now();
  await loadExtractor({ downloading: true });
  const vector = await embedLocally('cotton poplin for shirts');
  const rssMb = Math.round(process.memoryUsage().rss / 1024 / 1024);

  console.log(`${alreadyThere ? 'Found' : 'Downloaded'} ${MODEL_ID} in ${MODEL_DIR}`);
  console.log(`Model ready in ${Date.now() - started} ms; ${vector.length}-dimension vectors; process memory ${rssMb} MB`);
}

run().catch((err) => {
  console.error('Model download failed:', err.message);
  process.exit(1);
});
