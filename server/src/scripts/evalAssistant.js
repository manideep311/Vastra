/**
 * Measures the assistant's retrieval step against a small labelled question
 * set: how many products have embeddings, how long retrieval takes, and how
 * often an expected product appears in the top 5 results (hit@5).
 *
 * Retrieval here is exactly what the assistant uses: embed the question with
 * Hugging Face, then rank stored product vectors by cosine similarity.
 * It needs MONGO_URI, HF_TOKEN and HF_EMBEDDING_MODEL in server/.env.
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
const { semanticSearch } = require('../modules/ai/ai.service');

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

  const [totalProducts, embeddedProducts] = await Promise.all([
    Product.countDocuments(),
    Product.countDocuments({ 'embeddingVector.0': { $exists: true } }),
  ]);
  console.log(`\nQuestion set: ${path.relative(process.cwd(), file)} (${questions.length} questions)`);
  console.log(`Products with embeddings: ${embeddedProducts} of ${totalProducts}\n`);

  const latencies = [];
  let hits = 0;
  let failures = 0;

  for (const [i, item] of questions.entries()) {
    const expected = new Set(item.expectedProductIds || []);
    const missing = await Product.countDocuments({ _id: { $in: [...expected] } }).then((n) => expected.size - n);
    const started = process.hrtime.bigint();
    try {
      const results = await semanticSearch(item.question, TOP_K);
      const ms = Number(process.hrtime.bigint() - started) / 1e6;
      latencies.push(ms);
      const hit = results.some((r) => expected.has(r._id.toString()));
      if (hit) hits += 1;

      console.log(`${i + 1}. ${item.question}`);
      console.log(`   ${hit ? 'HIT ' : 'MISS'}  ${ms.toFixed(0)} ms`);
      results.forEach((r, rank) => {
        const mark = expected.has(r._id.toString()) ? '*' : ' ';
        console.log(`   ${mark} ${rank + 1}. ${r.name} (${r.similarityScore.toFixed(3)})`);
      });
      if (missing > 0) console.log(`   note: ${missing} expected product ID(s) are not in this database`);
    } catch (error) {
      failures += 1;
      console.log(`${i + 1}. ${item.question}`);
      console.log(`   FAILED  ${error.message}`);
    }
    console.log('');
  }

  const answered = questions.length - failures;
  console.log('Summary');
  console.log(`  Products with embeddings: ${embeddedProducts}/${totalProducts}`);
  if (answered > 0) {
    const average = latencies.reduce((sum, ms) => sum + ms, 0) / latencies.length;
    console.log(`  Retrieval latency: average ${average.toFixed(0)} ms, p95 ${percentile(latencies, 95).toFixed(0)} ms (n=${latencies.length})`);
    console.log(`  hit@${TOP_K}: ${hits}/${answered} (${((hits / answered) * 100).toFixed(0)}%)`);
  }
  if (failures > 0) console.log(`  Failed questions: ${failures} (not counted in hit@${TOP_K})`);

  await mongoose.disconnect();
  process.exitCode = failures > 0 ? 1 : 0;
}

run().catch(async (err) => {
  console.error('Evaluation failed:', err.message);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
