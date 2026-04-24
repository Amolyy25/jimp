/**
 * List of forbidden slugs for vanity URLs.
 * Includes reserved routes, offensive terms, and common platform keywords.
 */
export const FORBIDDEN_SLUGS = new Set([
  // System / Reserved
  'admin', 'administrator', 'api', 'auth', 'login', 'logout', 'register', 'signup',
  'signin', 'signout', 'profile', 'profiles', 'user', 'users', 'settings', 'config',
  'dashboard', 'editor', 'edit', 'view', 'jimp', 'help', 'support', 'contact',
  'about', 'terms', 'privacy', 'legal', 'docs', 'documentation', 'blog', 'news',
  'status', 'health', 'metrics', 'static', 'assets', 'public', 'images', 'uploads',
  'download', 'app', 'web', 'mobile', 'dev', 'developer', 'staging', 'prod',
  'root', 'home', 'index', 'search', 'find', 'explore', 'discover', 'trending',
  'popular', 'new', 'create', 'delete', 'update', 'remove', 'add', 'manage',

  // Offensive / Sensitive (Broad selection)
  'nigger', 'nigga', 'faggot', 'fag', 'kike', 'chink', 'gook', 'spic', 'retard',
  'cunt', 'pussy', 'dick', 'cock', 'penis', 'vagina', 'clit', 'asshole', 'bastard',
  'bitch', 'slut', 'whore', 'porn', 'porno', 'xxx', 'sex', 'sexual', 'fetish',
  'nude', 'naked', 'hitler', 'nazi', 'fuck', 'shit', 'piss', 'cum', 'ejaculate',
  'masturbate', 'pedophile', 'pedophel', 'rape', 'rapist', 'terrorist', 'isis',
  'alqaeda', 'taliban', 'suicide', 'kill', 'murder', 'death', 'blood', 'gore',
  'scat', 'bdsm', 'hentai', 'milf', 'dilf', 'shemale', 'tranny', 'incest',
  
  // Platform / Impersonation
  'system', 'official', 'verified', 'staff', 'mod', 'moderator', 'owner', 'ceo',
  'founder', 'google', 'apple', 'facebook', 'instagram', 'twitter', 'x', 'tiktok',
  'discord', 'spotify', 'youtube', 'twitch', 'amazon', 'microsoft', 'github',
  'cloudflare', 'stripe', 'paypal', 'visa', 'mastercard', 'americanexpress',
  'bank', 'money', 'crypto', 'bitcoin', 'eth', 'solana', 'nft', 'scam', 'phishing',
  'proxy', 'vpn', 'bot', 'botnet', 'hacker', 'cracked', 'warez', 'torrent',

  // Common French offensive terms (User is French)
  'pute', 'salope', 'connard', 'encule', 'pd', 'negre', 'bougnoule', 'bicot',
  'pute', 'bordel', 'merde', 'chiant', 'bite', 'couille', 'nichon', 'clito',
  'nique', 'baise', 'viol', 'tueur', 'mort', 'nazi', 'hitler', 'petasse',
  'trouduc', 'abruti', 'debile', 'mongol', 'clochard'
]);

export function isSlugForbidden(slug) {
  if (!slug) return true;
  const normalized = slug.toLowerCase().trim();
  
  // Check exact matches
  if (FORBIDDEN_SLUGS.has(normalized)) return true;
  
  // Check for common variations / substrings if needed, 
  // but usually exact match + regex for offensive patterns is enough.
  
  // Example regex for some offensive patterns
  const offensivePatterns = [
    /f[u\*][c\*]k/i,
    /sh[i\*]t/i,
    /n[i\*]gg[ae]r?/i,
    /p[o\*]rn/i,
  ];
  
  return offensivePatterns.some(pattern => pattern.test(normalized));
}
