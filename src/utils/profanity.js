/**
 * Client-side profanity filter — ultra-robust version.
 * Mirroring server/profanity.js for consistency.
 */

const BLOCKED = [
  // Racial / ethnic slurs
  'negro', 'negre', 'nigger', 'nigga', 'bougnoule', 'bicot', 'rebeu', 'chink', 'jap',
  // Homophobic slurs
  'faggot', 'pd', 'pede', 'tapette', 'goy',
  // Common raw insults
  'pute', 'putain', 'salope', 'connard', 'enculé', 'encule', 'fdp',
  'bitch', 'whore', 'slut', 'cunt', 'motherfucker',
  // Sexual slurs / threats
  'viol', 'rape',
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

function buildRobustRegex(word) {
  const normalized = word.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const parts = normalized.split('').map((char, index) => {
    const leet = LEET_MAP[char] || escapeRegex(char);
    const separator = index < normalized.length - 1 ? '[^a-z0-9]*' : '';
    return `${leet}+${separator}`;
  });
  return new RegExp(`(?:^|[^a-z0-9])(${parts.join('')})(?:$|[^a-z0-9])`, 'i');
}

const ROBUST_REGEXES = BLOCKED.map(buildRobustRegex);

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function detectProfanity(text) {
  if (!text) return [];
  const hits = new Set();
  for (let i = 0; i < BLOCKED.length; i++) {
    if (ROBUST_REGEXES[i].test(text)) {
      hits.add(BLOCKED[i]);
    }
  }
  return Array.from(hits);
}

export function hasProfanity(text) {
  if (!text) return false;
  return ROBUST_REGEXES.some(re => re.test(text));
}
