/**
 * Minimal content filter.
 *
 * Scope: a small list of clear-cut slurs and insults (FR + EN) that we don't
 * want displayed on a public profile. This isn't moderation — we flag offending
 * words in the UI and leak a visual warning; we don't block the user.
 *
 * If you need to extend this list, keep entries lowercase and use word-boundary
 * friendly tokens (no regex metacharacters). Matching is case-insensitive and
 * ignores leet-speak variants at a shallow level (0→o, 1→i, 3→e, 4→a, 5→s).
 */

// Keep this list short & deliberate — avoid false positives on innocuous words.
const BLOCKED = [
  // Racial / ethnic slurs
  'negro', 'negre', 'nigger', 'nigga', 'bougnoule', 'bicot', 'rebeu', 'chink', 'jap',
  // Homophobic slurs
  'faggot', 'pd', 'pede', 'tapette',
  // Common raw insults
  'pute', 'putain', 'salope', 'connard', 'enculé', 'encule', 'fdp',
  'bitch', 'whore', 'slut', 'cunt', 'motherfucker',
  // Sexual slurs / threats
  'viol', 'rape',
];

/** Normalise a string for matching — lowercases and collapses common leet-speak. */
function normalize(str) {
  return str
    .toLowerCase()
    .replace(/[0]/g, 'o')
    .replace(/[1!]/g, 'i')
    .replace(/[3]/g, 'e')
    .replace(/[4@]/g, 'a')
    .replace(/[5$]/g, 's')
    .replace(/[7]/g, 't');
}

/**
 * Returns an array of offending tokens found in `text`, or an empty array.
 * Matching is word-boundary aware so "escargot" won't trigger on "go".
 */
export function detectProfanity(text) {
  if (!text) return [];
  const normalized = normalize(text);
  const hits = new Set();
  for (const word of BLOCKED) {
    // Word-boundary match — supports accented chars by escaping the boundary
    // check with a lookaround.
    const re = new RegExp(`(?:^|[^a-z])${escapeRegex(word)}(?:$|[^a-z])`, 'i');
    if (re.test(normalized)) hits.add(word);
  }
  return Array.from(hits);
}

/** Boolean sugar. */
export function hasProfanity(text) {
  return detectProfanity(text).length > 0;
}

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
