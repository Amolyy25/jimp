/**
 * Server-side profanity filter — single source of truth.
 *
 * Keep the list short and word-boundary friendly. Matching is case-insensitive
 * and tolerant of common leet-speak (0→o, 1→i, 3→e, 4→a, 5→s, 7→t).
 *
 * Two modes:
 *   - `hasProfanity(text)`     → boolean (use to reject input)
 *   - `maskProfanity(text)`    → returns the original string with offending
 *                                 tokens replaced by `*` (use to soft-clean
 *                                 user-visible content like guestbook posts)
 *
 * The list mirrors `src/utils/profanity.js` so client- and server-side checks
 * stay consistent. If you add a word here, mirror it there.
 */

const BLOCKED = [
  // Racial / ethnic slurs (FR + EN)
  'negro', 'negre', 'nigger', 'nigga', 'bougnoule', 'bicot', 'rebeu',
  'chink', 'jap', 'gook', 'spic', 'kike',
  // Homophobic / transphobic slurs
  'faggot', 'fag', 'pd', 'pede', 'tapette', 'tranny', 'shemale',
  // Common raw insults
  'pute', 'putain', 'salope', 'connard', 'enculé', 'encule', 'fdp',
  'petasse', 'trouduc', 'mongol', 'debile', 'abruti',
  'bitch', 'whore', 'slut', 'cunt', 'motherfucker', 'retard',
  // Sexual / threats
  'viol', 'rape', 'rapist', 'pedophile', 'incest', 'hentai',
  // Hate / extremism
  'hitler', 'nazi', 'isis', 'taliban',
];

function normalize(str) {
  return String(str)
    .toLowerCase()
    .replace(/[0]/g, 'o')
    .replace(/[1!]/g, 'i')
    .replace(/[3]/g, 'e')
    .replace(/[4@]/g, 'a')
    .replace(/[5$]/g, 's')
    .replace(/[7]/g, 't');
}

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function detectProfanity(text) {
  if (!text) return [];
  const normalized = normalize(text);
  const hits = new Set();
  for (const word of BLOCKED) {
    const re = new RegExp(`(?:^|[^a-z])${escapeRegex(word)}(?:$|[^a-z])`, 'i');
    if (re.test(normalized)) hits.add(word);
  }
  return Array.from(hits);
}

export function hasProfanity(text) {
  return detectProfanity(text).length > 0;
}

/**
 * Return `text` with detected blocked tokens replaced by `*` characters.
 * Doesn't normalise — only swaps direct substring matches of the trigger
 * words. That way the user keeps their original phrasing minus the slurs.
 */
export function maskProfanity(text, maxLen = 240) {
  if (!text) return '';
  let out = String(text).slice(0, maxLen);
  const normalized = normalize(out);
  for (const word of BLOCKED) {
    const re = new RegExp(`(?:^|[^a-z])${escapeRegex(word)}(?:$|[^a-z])`, 'i');
    if (re.test(normalized)) {
      const sub = new RegExp(escapeRegex(word), 'gi');
      out = out.replace(sub, '*'.repeat(word.length));
    }
  }
  return out.trim();
}

/**
 * Walk an arbitrary object/array and check every string field for profanity.
 * Useful for screening profile blobs without listing every property by hand.
 * Returns the FIRST offending token found, or null.
 */
export function findProfanityInObject(obj, depth = 0) {
  if (depth > 8 || obj == null) return null;
  if (typeof obj === 'string') {
    const hits = detectProfanity(obj);
    return hits.length ? hits[0] : null;
  }
  if (Array.isArray(obj)) {
    for (const item of obj) {
      const hit = findProfanityInObject(item, depth + 1);
      if (hit) return hit;
    }
    return null;
  }
  if (typeof obj === 'object') {
    for (const key of Object.keys(obj)) {
      const hit = findProfanityInObject(obj[key], depth + 1);
      if (hit) return hit;
    }
  }
  return null;
}
