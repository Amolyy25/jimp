/**
 * Server-side CSS sanitizer for the per-profile `theme.customCss` field.
 *
 * We scope user CSS to `#profile-root` at render time, but a determined user
 * could still inject `expression()`, `url(javascript:…)`, `@import`,
 * `@charset` or behaviour-style rules from old IE that some browsers still
 * honour. We strip those byte-level before persisting.
 *
 * This is NOT a parser — keeping the surface tiny is on purpose. The
 * trade-off: we may strip some legal CSS that just happens to contain a
 * banned token (e.g. a string literal "javascript:tip"). That's acceptable
 * for an advanced opt-in feature with a 4 KB cap.
 */

const MAX_BYTES = 4096;

const FORBIDDEN_PATTERNS = [
  /@import\b/gi,
  /@charset\b/gi,
  /expression\s*\(/gi,
  /javascript\s*:/gi,
  /vbscript\s*:/gi,
  /behavior\s*:/gi,
  /-moz-binding\s*:/gi,
  // Block CSS-imported fonts/images going to off-network/proto-relative
  // URLs that might leak the visitor's origin to third parties. We only
  // allow https:// and data: in url(...).
  /url\s*\(\s*(['"]?)\s*(?!https:\/\/|data:|#|\/)[^)]*\1\s*\)/gi,
];

export function sanitizeCustomCss(input) {
  if (typeof input !== 'string') return '';
  let css = input.slice(0, MAX_BYTES);
  // Strip comments — they're a common vector for hiding banned tokens that
  // browsers ignore but signature scanners miss.
  css = css.replace(/\/\*[\s\S]*?\*\//g, '');
  for (const re of FORBIDDEN_PATTERNS) {
    css = css.replace(re, '/* removed */ ');
  }
  // Defence-in-depth: kill `</style` so a payload can't break out of the
  // injected <style> tag at render time.
  css = css.replace(/<\/style/gi, '<\\/style');
  return css.trim();
}
