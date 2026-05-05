/**
 * CAP captcha — server-side challenge generator + token verifier.
 *
 * Mounts:
 *   POST /api/cap/challenge → { challenge, token, expires }
 *   POST /api/cap/redeem    → { success, token, expires }
 *
 * The widget hits these endpoints, solves the SHA-256 PoW client-side,
 * exchanges the solution for a token, and submits the token alongside
 * the form. Server then calls verifyCaptchaToken() to redeem it.
 *
 * Verification is OFF by default — set CAP_ENABLED=true to enforce.
 * When disabled, verifyCaptchaToken() returns true so dev/preview
 * environments work without a captcha layer.
 */

import Cap from '@cap.js/server';

let capInstance = null;
function getCap() {
  if (capInstance) return capInstance;
  // noFSState keeps state in memory only — fine for single-instance
  // deploys. Move to custom storage hooks if scaling horizontally.
  capInstance = new Cap({ noFSState: true });
  return capInstance;
}

export function isCapEnabled() {
  return process.env.CAP_ENABLED === 'true' || process.env.CAP_ENABLED === true;
}

/** Returns true when verification passes OR the captcha layer is off. */
export async function verifyCaptchaToken(token) {
  if (!isCapEnabled()) return true;
  if (!token || typeof token !== 'string') return false;
  try {
    const r = await getCap().validateToken(token);
    return !!r.success;
  } catch (err) {
    console.error('[cap] validateToken failed:', err);
    return false;
  }
}

export function registerCapRoutes(app) {
  const cap = getCap();

  app.post('/api/cap/challenge', async (_req, res) => {
    console.log('[cap] POST /api/cap/challenge');
    if (!isCapEnabled()) {
      console.warn('[cap] challenge requested but CAP_ENABLED is false');
      return res.status(503).json({ error: 'Captcha disabled on server' });
    }
    try {
      const challenge = await cap.createChallenge();
      console.log('[cap] challenge created:', challenge.token);
      res.json(challenge);
    } catch (err) {
      console.error('[cap] createChallenge failed:', err);
      res.status(500).json({ error: 'Captcha unavailable' });
    }
  });

  app.post('/api/cap/redeem', async (req, res) => {
    console.log('[cap] POST /api/cap/redeem', req.body?.token);
    if (!isCapEnabled()) {
      console.warn('[cap] redeem requested but CAP_ENABLED is false');
      return res.status(503).json({ error: 'Captcha disabled on server' });
    }
    try {
      const result = await cap.redeemChallenge({
        token: req.body?.token,
        solutions: req.body?.solutions,
      });
      console.log('[cap] redeem result:', result.success ? 'OK' : 'FAIL', result.message || '');
      res.json(result);
    } catch (err) {
      console.error('[cap] redeemChallenge failed:', err);
      res.status(500).json({ error: 'Captcha unavailable' });
    }
  });
}
