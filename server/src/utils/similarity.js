// Cosine similarity: measures the angle between two vectors, ignoring magnitude.
// Returns a value from -1 (opposite) to 1 (identical direction). A zero vector
// has no direction, so it scores 0 instead of dividing by zero (NaN).
const cosineSimilarity = (vecA, vecB) => {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }

  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
};

module.exports = { cosineSimilarity };