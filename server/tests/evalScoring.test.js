const { resolveExpected, firstHitRank, summarise } = require('../src/scripts/evalScoring');

describe('eval scoring helpers', () => {
  const idsByName = new Map([
    ['terry towel fabric', ['t1']],
    ['raw selvedge denim 14oz', ['d1']],
  ]);
  const existingIds = new Set(['t1', 'd1', 'x9']);

  test('resolves names case-insensitively and keeps known IDs', () => {
    const { expected, missingNames, missingIds } = resolveExpected(
      { expectedProductIds: ['x9', 'gone'], expectedNames: ['Terry Towel Fabric', 'No Such Fabric'] },
      idsByName,
      existingIds
    );
    expect([...expected].sort()).toEqual(['t1', 'x9']);
    expect(missingNames).toEqual(['No Such Fabric']);
    expect(missingIds).toEqual(['gone']);
  });

  test('a question with nothing resolvable has an empty expected set', () => {
    const { expected } = resolveExpected({ expectedNames: ['Unknown'] }, idsByName, existingIds);
    expect(expected.size).toBe(0);
  });

  test('firstHitRank is 1-based and null on a miss', () => {
    const expected = new Set(['d1']);
    expect(firstHitRank(['a', 'd1', 'b'], expected)).toBe(2);
    expect(firstHitRank(['a', 'b'], expected)).toBeNull();
  });

  test('summarise computes hit@1, hit@k and MRR', () => {
    const result = summarise([1, 2, null, 5, 7], 5);
    expect(result.n).toBe(5);
    expect(result.hitAt1).toBeCloseTo(1 / 5);
    expect(result.hitAtK).toBeCloseTo(3 / 5);
    expect(result.mrr).toBeCloseTo((1 + 1 / 2 + 1 / 5) / 5);
  });

  test('summarise handles an empty set', () => {
    expect(summarise([], 5)).toEqual({ n: 0, hitAt1: 0, hitAtK: 0, mrr: 0 });
  });
});
