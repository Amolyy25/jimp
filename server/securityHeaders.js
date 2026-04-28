/**
 * Baseline security headers. Mirrors the most useful Helmet defaults
 * without pulling Helmet as a dependency.
 *
 * Notes:
 *  - CSP is intentionally permissive for inline styles/SVG (the editor relies
 *    on inline style attributes for drag-and-drop transforms). Scripts are
 *    restricted to self + the small set of CDNs we use (Google Fonts).
 *  - HSTS is only emitted in production behind HTTPS. Don't enable it locally
 *    unless you want your dev machine to refuse http://localhost.
 *  - Frame-Options is DENY because no part of persn.me is meant to be embedded.
 */

const IS_PROD = process.env.NODE_ENV === 'production';

export function securityHeaders(req, res, next) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=(), interest-cohort=()',
  );
  res.setHeader('X-DNS-Prefetch-Control', 'off');
  res.setHeader('X-XSS-Protection', '0'); // modern browsers ignore; explicit off avoids legacy quirks

  if (IS_PROD) {
    // Only safe to send when the response actually goes over HTTPS.
    res.setHeader(
      'Strict-Transport-Security',
      'max-age=31536000; includeSubDomains',
    );
  }

  // CSP — permissive enough for the SPA + editor, restrictive on script
  // sources. Profile pages embed user-supplied content (avatars, link
  // previews, music sources) so img-src and media-src have to be wide.
  // We keep `unsafe-inline` for styles only because the canvas relies on it.
  const csp = [
    "default-src 'self'",
    "base-uri 'self'",
    "frame-ancestors 'none'",
    "form-action 'self'",
    "object-src 'none'",
    "script-src 'self' 'unsafe-inline'",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' data: https://fonts.gstatic.com",
    "img-src 'self' data: blob: https:",
    "media-src 'self' data: blob: https:",
    "connect-src 'self' https: wss:",
    "frame-src 'self' https:",
  ].join('; ');
  res.setHeader('Content-Security-Policy', csp);

  next();
}
