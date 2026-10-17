/**
 * Measures the assistant's retrieval step against a labelled question set:
 * how many products have embeddings, how long retrieval takes, and how often
 * an expected product appears first (hit@1) or in the top 5 (hit@5), plus
 * mean reciprocal rank. Expected products can be given by ID or by name.
 *
 * Retrieval here is exactly what the assistant uses: embed the question with
 * the configured embedding model, then rank stored product vectors by cosine
 * similarity. It needs MONGO_URI in server/.env (plus HF_TOKEN and
 * HF_EMBEDDING_MODEL when EMBEDDING_PROVIDER=huggingface).
 *
 * Run from the server/ directory:
 *   npm run eval:assistant
 *   npm run eval:assistant -- --file eval/questions.json
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const Product = require('../models/Product');
const { semanticSearch, EMBEDDING_PROVIDER } = require('../modules/ai/ai.service');
const { normaliseName, resolveExpected, firstHitRank, summarise } = require('./evalScoring');

const TOP_K = 5;

const argValue = (flag) => {
  const index = process.argv.indexOf(flag);
  return index === -1 ? null : process.argv[index + 1];
};

const percentile = (values, p) => {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.max(0, Math.ceil((p / 100) * sorted.length) - 1)];
};

async function run() {
  const file = path.resolve(argValue('--file') || path.join(__dirname, '../../eval/questions.json'));
  const { questions } = JSON.parse(fs.readFileSync(file, 'utf8'));
  if (!Array.isArray(questions) || questions.length === 0) throw new Error(`No questions found in ${file}`);

  await connectDB();

  const [totalProducts, embeddedProducts, catalog] = await Promise.all([
    Product.countDocuments(),
    Product.countDocuments({ 'embeddingVector.0': { $exists: true } }),
    Product.find({}, { name: 1 }).lean(),
  ]);
  const existingIds = new Set(catalog.map((p) => p._id.toString()));
  const idsByName = new Map();
  for (const p of catalog) {
    const key = normaliseName(p.name);
    idsByName.set(key, [...(idsByName.get(key) || []), p._id.toString()]);
  }

  console.log(`\nQuestion set: ${path.relative(process.cwd(), file)} (${questions.length} questions)`);
  console.log(`Products with embeddings: ${embeddedProducts} of ${totalProducts}\n`);

  const latencies = [];
  const ranks = [];
  const unmatchedNames = new Set();
  let failures = 0;
  let skipped = 0;

  for (const [i, item] of questions.entries()) {
    const { expected, missingNames, missingIds } = resolveExpected(item, idsByName, existingIds);
    missingNames.forEach((name) => unmatchedNames.add(name));
    console.log(`${i + 1}. ${item.question}`);

    if (expected.size === 0) {
      skipped += 1;
      console.log('   SKIP  none of the expected products are in this database');
      console.log('');
      continue;
    }

    const started = process.hrtime.bigint();
    try {
      const results = await semanticSearch(item.question, TOP_K);
      const ms = Number(process.hrtime.bigint() - started) / 1e6;
      latencies.push(ms);
      const rank = firstHitRank(results.map((r) => r._id.toString()), expected);
      ranks.push(rank);

      console.log(`   ${rank ? `HIT@${rank}` : 'MISS  '}  ${ms.toFixed(0)} ms`);
      results.forEach((r, position) => {
        const mark = expected.has(r._id.toString()) ? '*' : ' ';
        console.log(`   ${mark} ${position + 1}. ${r.name} (${r.similarityScore.toFixed(3)})`);
      });
      if (missingNames.length || missingIds.length) {
        console.log(`   note: ${missingNames.length + missingIds.length} expected product(s) not found in this database`);
      }
    } catch (error) {
      failures += 1;
      console.log(`   FAILED  ${error.message}`);
    }
    console.log('');
  }

  const scores = summarise(ranks, TOP_K);
  const pct = (value) => `${(value * 100).toFixed(0)}%`;
  console.log('Summary');
  console.log(`  Embedding provider: ${EMBEDDING_PROVIDER}`);
  console.log(`  Products with embeddings: ${embeddedProducts}/${totalProducts}`);
  if (scores.n > 0) {
    const average = latencies.reduce((sum, ms) => sum + ms, 0) / latencies.length;
    console.log(`  Retrieval latency: average ${average.toFixed(0)} ms, median ${percentile(latencies, 50).toFixed(0)} ms, p95 ${percentile(latencies, 95).toFixed(0)} ms (n=${latencies.length})`);
    console.log(`  Scored questions: ${scores.n}`);
    console.log(`  hit@1: ${pct(scores.hitAt1)}   hit@${TOP_K}: ${pct(scores.hitAtK)}   MRR@${TOP_K}: ${scores.mrr.toFixed(3)}`);
  }
  if (skipped > 0) console.log(`  Skipped (no expected product in this database): ${skipped}`);
  if (failures > 0) console.log(`  Failed questions: ${failures} (not scored)`);
  if (unmatchedNames.size > 0) {
    console.log(`  Expected names not found in the catalog (check spelling or update eval/questions.json):`);
    [...unmatchedNames].sort().forEach((name) => console.log(`    - ${name}`));
  }
  console.log(`  Process memory (RSS): ${Math.round(process.memoryUsage().rss / 1024 / 1024)} MB`);

  await mongoose.disconnect();
  process.exitCode = failures > 0 ? 1 : 0;
}

run().catch(async (err) => {
  console.error('Evaluation failed:', err.message);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
