/**
 * List of forbidden slugs for vanity URLs.
 * Includes reserved routes, offensive terms, and common platform keywords.
 */
export const FORBIDDEN_SLUGS = new Set([
  // System / Reserved
  'admin', 'administrator', 'api', 'auth', 'login', 'logout', 'register', 'signup',
  'signin', 'signout', 'profile', 'profiles', 'user', 'users', 'settings', 'config',
  'dashboard', 'editor', 'edit', 'view', 'persn', 'persnme', 'persn-me',
  'analytique', 'analytics',
  'help', 'support', 'contact',
  'about', 'terms', 'privacy', 'legal', 'docs', 'documentation', 'blog', 'news',
  'status', 'health', 'metrics', 'static', 'assets', 'public', 'images', 'uploads',
  'download', 'app', 'web', 'mobile', 'dev', 'developer', 'staging', 'prod',
  'root', 'home', 'index', 'search', 'find', 'explore', 'discover', 'trending',
  'popular', 'new', 'create', 'delete', 'update', 'remove', 'add', 'manage',
  'clicker', 'leaderboard', 'ranking', 'sitemap', 'robots',

  // Offensive / Sensitive (Broad selection)
  'nigger', 'nigga', 'faggot', 'fag', 'kike', 'chink', 'gook', 'spic', 'retard',
  'cunt', 'pussy', 'dick', 'cock', 'penis', 'vagina', 'clit', 'asshole', 'bastard',
  'bitch', 'slut', 'whore', 'porn', 'porno', 'xxx', 'sex', 'sexual', 'fetish',
  'nude', 'naked', 'hitler', 'nazi', 'fuck', 'shit', 'piss', 'cum', 'ejaculate',
  'masturbate', 'pedophile', 'pedophel', 'rape', 'rapist', 'terrorist', 'isis',
  'alqaeda', 'taliban', 'suicide', 'kill', 'murder', 'death', 'blood', 'gore',
  'scat', 'bdsm', 'hentai', 'milf', 'dilf', 'shemale', 'tranny', 'incest',
  
  // Platform / Impersonation & Large Brands
  'system', 'official', 'verified', 'staff', 'mod', 'moderator', 'owner', 'ceo',
  'founder', 'admin-support', 'security', 'safety', 'abuse',
  'google', 'apple', 'facebook', 'instagram', 'twitter', 'x', 'tiktok', 'snapchat', 'snap',
  'discord', 'spotify', 'youtube', 'twitch', 'amazon', 'microsoft', 'github', 'linkedin',
  'reddit', 'netflix', 'disney', 'whatsapp', 'telegram', 'signal', 'messenger',
  'cloudflare', 'stripe', 'paypal', 'visa', 'mastercard', 'americanexpress', 'amex',
  'bank', 'money', 'crypto', 'bitcoin', 'eth', 'solana', 'nft', 'scam', 'phishing',
  'binance', 'coinbase', 'revolut', 'lydia', 'boursorama', 'fortuneo', 'n26',
  'rolex', 'louisvuitton', 'gucci', 'prada', 'nike', 'adidas', 'puma', 'zara',
  'tesla', 'spacex', 'starlink', 'valve', 'steam', 'epicgames', 'roblox', 'minecraft',
  'nintendo', 'sony', 'playstation', 'xbox', 'nvidid', 'amd', 'intel', 'samsung',
  'proxy', 'vpn', 'bot', 'botnet', 'hacker', 'cracked', 'warez', 'torrent', 'proxy',

  // Celebrities / Public Figures
  'elonmusk', 'elon', 'billgates', 'jeffbezos', 'markzuckerberg', 'zuck', 'trump',
  'donaldtrump', 'biden', 'joebiden', 'obama', 'putin', 'macron', 'emmanuelmacron',
  'messi', 'ronaldo', 'cr7', 'neymar', 'mbappe', 'lebron', 'kanye', 'ye', 'taylorswift',
  'mrbeast', 'pewdiepie',

  // French Institutions / Sensitive
  'ameli', 'impots', 'caf', 'police', 'gendarmerie', 'elysee', 'gouvernement', 'gouv',
  'service-public', 'identitenumerique', 'franceidentite', 'monfranceconnect',
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
