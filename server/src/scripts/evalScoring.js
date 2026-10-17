/**
 * Pure helpers for the assistant retrieval evaluation, kept separate from the
 * script so they can be unit tested without a database.
 */

const normaliseName = (name) => String(name || '').trim().toLowerCase();

/**
 * Work out which product IDs count as a correct answer for one question.
 * Questions can list expectedProductIds, expectedNames, or both. Names are
 * matched case-insensitively against the catalog, so a question keeps working
 * after a reseed gives products new IDs.
 *
 * @param {{expectedProductIds?: string[], expectedNames?: string[]}} item
 * @param {Map<string, string[]>} idsByName  normalised product name -> IDs
 * @param {Set<string>} existingIds          IDs present in the database
 * @returns {{expected: Set<string>, missingNames: string[], missingIds: string[]}}
 */
function resolveExpected(item, idsByName, existingIds) {
  const expected = new Set();
  const missingIds = [];
  for (const id of item.expectedProductIds || []) {
    if (existingIds.has(String(id))) expected.add(String(id));
    else missingIds.push(String(id));
  }
  const missingNames = [];
  for (const name of item.expectedNames || []) {
    const ids = idsByName.get(normaliseName(name));
    if (ids && ids.length) ids.forEach((id) => expected.add(id));
    else missingNames.push(name);
  }
  return { expected, missingNames, missingIds };
}

/** 1-based rank of the first expected product in the results, or null. */
function firstHitRank(resultIds, expected) {
  const index = resultIds.findIndex((id) => expected.has(String(id)));
  return index === -1 ? null : index + 1;
}

/**
 * Aggregate per-question ranks into hit@1, hit@k and mean reciprocal rank.
 * Ranks beyond k count as misses.
 * @param {(number|null)[]} ranks
 * @param {number} k
 */
function summarise(ranks, k) {
  const n = ranks.length;
  if (n === 0) return { n: 0, hitAt1: 0, hitAtK: 0, mrr: 0 };
  const within = ranks.filter((rank) => rank !== null && rank <= k);
  return {
    n,
    hitAt1: within.filter((rank) => rank === 1).length / n,
    hitAtK: within.length / n,
    mrr: within.reduce((sum, rank) => sum + 1 / rank, 0) / n,
  };
}

module.exports = { normaliseName, resolveExpected, firstHitRank, summarise };
