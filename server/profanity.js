/**
 * Server-side profanity filter — ultra-robust version.
 *
 * This filter handles common bypasses:
 * - Repeated characters (puuuuute)
 * - Punctuation/spaces between characters (p.u.t.e, p u t e)
 * - Leet-speak and homoglyphs (p#ute, p0rn, @ss, рute with Cyrillic p)
 * - Accents (enculé)
 */

const BLOCKED = [
  // Racial / ethnic slurs (FR + EN)
  'negro', 'negre', 'nigger', 'nigga', 'bougnoule', 'bicot', 'rebeu',
  'chink', 'jap', 'gook', 'spic', 'kike',
  // Homophobic / transphobic slurs
  'faggot', 'fag', 'pd', 'pede', 'tapette', 'tranny', 'shemale', 'goy',
  // Common raw insults
  'pute', 'putain', 'salope', 'connard', 'enculé', 'encule', 'fdp',
  'petasse', 'trouduc', 'mongol', 'debile', 'abruti',
  'bitch', 'whore', 'slut', 'cunt', 'motherfucker', 'retard',
  // Sexual / threats
  'viol', 'rape', 'rapist', 'pedophile', 'incest', 'hentai',
  // Hate / extremism
  'hitler', 'nazi', 'isis', 'taliban',
];

const LEET_MAP = {
  'a': '[a4@àâäаα]',
  'b': '[b8ß]',
  'c': '[cç(с]',
  'd': '[d]',
  'e': '[e3éèêëе€]',
  'f': '[f]',
  'g': '[g9]',
  'h': '[h]',
  'i': '[i1!ìîïі|]',
  'j': '[j]',
  'k': '[k]',
  'l': '[l1|]',
  'm': '[m]',
  'n': '[nñ]',
  'o': '[o0ôöоø]',
  'p': '[pр]',
  'q': '[q]',
  'r': '[r]',
  's': '[s5$z§]',
  't': '[t7+†]',
  'u': '[uùûü#vц]',
  'v': '[v]',
  'w': '[w]',
  'x': '[xх]',
  'y': '[yу]',
  'z': '[z2]',
};

/**
 * Builds a regex that is robust against repetitions, spacing, and leet-speak.
 */
function buildRobustRegex(word) {
  const normalized = word.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const parts = normalized.split('').map((char, index) => {
    const leet = LEET_MAP[char] || escapeRegex(char);
    // Allow repetitions (+) and optional separators ([^a-z0-9]*) between characters.
    const separator = index < normalized.length - 1 ? '[^a-z0-9]*' : '';
    return `${leet}+${separator}`;
  });
  // Use non-word/digit boundaries to avoid the Scunthorpe problem (e.g., "computer")
  return new RegExp(`(?:^|[^a-z0-9])(${parts.join('')})(?:$|[^a-z0-9])`, 'i');
}

const ROBUST_REGEXES = BLOCKED.map(buildRobustRegex);

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function detectProfanity(text) {
  if (!text) return [];
  const hits = [];
  for (let i = 0; i < BLOCKED.length; i++) {
    const match = text.match(ROBUST_REGEXES[i]);
    if (match) {
      hits.push(BLOCKED[i]);
    }
  }
  return hits;
}

export function hasProfanity(text) {
  if (!text) return false;
  return ROBUST_REGEXES.some(re => re.test(text));
}

/**
 * Return `text` with detected blocked tokens replaced by `*` characters.
 */
export function maskProfanity(text, maxLen = 240) {
  if (!text) return '';
  let out = String(text).slice(0, maxLen);
  
  for (let i = 0; i < BLOCKED.length; i++) {
    // We need to global match for masking
    const re = new RegExp(ROBUST_REGEXES[i].source, 'gi');
    out = out.replace(re, (match, p1) => {
      // p1 is the captured group containing the offending word (without boundaries)
      if (!p1) return match;
      const startBoundary = match.indexOf(p1);
      const prefix = match.substring(0, startBoundary);
      const suffix = match.substring(startBoundary + p1.length);
      return prefix + '*'.repeat(p1.length) + suffix;
    });
  }
  return out.trim();
}

/**
 * Walk an arbitrary object/array and check every string field for profanity.
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
