/**
 * Simple fuzzy matching for lead names.
 * Uses a combination of substring matching and Levenshtein distance
 * to find the best match from a list of candidates.
 */

function levenshtein(a: string, b: string): number {
  const m = a.length, n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[m][n];
}

/**
 * Scores how well `query` matches `candidate` (0 = no match, 1 = perfect).
 * Combines normalized Levenshtein distance with substring bonus.
 */
function score(query: string, candidate: string): number {
  const q = query.toLowerCase().trim();
  const c = candidate.toLowerCase().trim();

  if (c === q) return 1;
  if (c.includes(q) || q.includes(c)) return 0.9;

  // Check if all query words appear in candidate
  const qWords = q.split(/\s+/);
  const allWordsMatch = qWords.every(w => c.includes(w));
  if (allWordsMatch) return 0.85;

  // Levenshtein on the shorter of the two to handle partial names
  const dist = levenshtein(q, c);
  const maxLen = Math.max(q.length, c.length);
  const similarity = 1 - dist / maxLen;

  // Also check each word individually for partial word matches
  const cWords = c.split(/\s+/);
  let wordScore = 0;
  for (const qw of qWords) {
    let bestWord = 0;
    for (const cw of cWords) {
      if (cw.includes(qw) || qw.includes(cw)) {
        bestWord = Math.max(bestWord, 0.8);
      } else {
        const wDist = levenshtein(qw, cw);
        const wSim = 1 - wDist / Math.max(qw.length, cw.length);
        bestWord = Math.max(bestWord, wSim);
      }
    }
    wordScore += bestWord;
  }
  wordScore = qWords.length > 0 ? wordScore / qWords.length : 0;

  return Math.max(similarity, wordScore);
}

export interface FuzzyResult<T> {
  item: T;
  score: number;
}

/**
 * Find the best fuzzy matches from a list of items.
 * @param query - The search string
 * @param items - Array of items to search
 * @param accessor - Function to get the searchable string from an item
 * @param threshold - Minimum score to include (default 0.4)
 * @returns Sorted array of matches above threshold (best first)
 */
export function fuzzyMatch<T>(
  query: string,
  items: T[],
  accessor: (item: T) => string,
  threshold = 0.4,
): FuzzyResult<T>[] {
  if (!query?.trim() || !items?.length) return [];

  return items
    .map(item => ({ item, score: score(query, accessor(item)) }))
    .filter(r => r.score >= threshold)
    .sort((a, b) => b.score - a.score);
}
