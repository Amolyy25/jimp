/**
 * Tiny validation helpers used by the auth + profile routes.
 *
 * Goal: cheap, predictable checks that run before we ever touch the database.
 * Keep these focused on FORMAT only — semantic uniqueness lives in the
 * Prisma schema (unique indexes) and the route handlers themselves.
 */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const USERNAME_RE = /^[a-zA-Z0-9_.-]{2,30}$/;
// New claims must be 4-30. Short slugs (2-3 chars) are reserved for a future
// premium tier — `SLUG_GRANDFATHER_RE` keeps existing 2-3 char profiles
// reachable on routing/QR/etc, but `SLUG_RE` is the bar for new claims.
const SLUG_RE = /^[a-z0-9][a-z0-9-]{3,29}$/;
const SLUG_GRANDFATHER_RE = /^[a-z0-9][a-z0-9-]{1,29}$/;

const URL_PROTOCOLS = new Set(['http:', 'https:']);

export function isEmail(s) {
  return typeof s === 'string' && EMAIL_RE.test(s) && s.length <= 254;
}

export function isUsername(s) {
  return typeof s === 'string' && USERNAME_RE.test(s);
}

export function isSlug(s) {
  return typeof s === 'string' && SLUG_RE.test(s);
}

/** Routing/lookup form — accepts grandfathered 2-3 char slugs. */
export function isSlugRoutable(s) {
  return typeof s === 'string' && SLUG_GRANDFATHER_RE.test(s);
}

export function isStrongEnoughPassword(s) {
  return typeof s === 'string' && s.length >= 8 && s.length <= 128;
}

/** Permissive http(s) URL check; rejects javascript:, data:, file:, etc. */
export function isSafeHttpUrl(s) {
  if (typeof s !== 'string' || s.length > 2048) return false;
  try {
    const u = new URL(s);
    return URL_PROTOCOLS.has(u.protocol);
  } catch {
    return false;
  }
}

/**
 * Estimate the byte size of a JSON value without JSON.stringify on big trees
 * (which doubles peak memory). Good enough for a "too big?" gate.
 */
export function approxJsonBytes(value) {
  try {
    return Buffer.byteLength(JSON.stringify(value), 'utf8');
  } catch {
    return Infinity;
  }
}
