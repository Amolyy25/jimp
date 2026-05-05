/**
 * Lazy CAP captcha challenge.
 *
 * The widget runtime is loaded only on first use (saves bundle weight on
 * pages that don't need a captcha). When `VITE_CAP_ENABLED` is unset we
 * no-op and return `null` — the server skips verification in that mode
 * too, so dev / preview just works.
 *
 * Two flows:
 *   - getCaptchaToken()   → invisible programmatic solve (used by Q&A widget)
 *   - <CapCaptcha />      → visible widget React wrapper (used by auth forms)
 *
 * CAP solves a SHA-256 PoW challenge in-browser via WASM, redeems the
 * solution against `/api/cap/redeem`, and yields a short-lived token.
 */

const CAP_API_ENDPOINT = '/api/cap/';

let widgetModulePromise = null;
function loadWidgetModule() {
  if (widgetModulePromise) return widgetModulePromise;
  widgetModulePromise = import('@cap.js/widget');
  return widgetModulePromise;
}

export function isCaptchaEnabled() {
  return import.meta.env.VITE_CAP_ENABLED === 'true';
}

/**
 * Run an invisible CAP challenge and return a verification token, or `null`
 * if the captcha is disabled / errored. We return `null` rather than
 * throwing because the server gracefully accepts a missing token when
 * CAP_ENABLED is unset, so the UI can still proceed.
 */
export async function getCaptchaToken() {
  if (!isCaptchaEnabled()) {
    console.log('[captcha] disabled, skipping');
    return null;
  }
  console.log('[captcha] starting solve...');
  try {
    const mod = await loadWidgetModule();
    console.log('[captcha] module loaded');
    const Cap = mod.Cap || mod.default || mod;
    if (!Cap || typeof Cap !== 'function') {
      console.warn('[captcha] @cap.js/widget loaded without valid Cap constructor', mod);
      return null;
    }
    const cap = new Cap({ apiEndpoint: CAP_API_ENDPOINT });
    
    // Add a timeout to solve() to prevent indefinite hanging
    const solvePromise = cap.solve();
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Captcha timeout')), 15000)
    );

    const { success, token } = await Promise.race([solvePromise, timeoutPromise]);
    
    if (!success || !token) {
      console.warn('[captcha] solve returned no token');
      return null;
    }
    return token;
  } catch (err) {
    console.error('[captcha] failed:', err);
    return null;
  }
}

/** Eager-load the widget runtime — call from CapCaptcha so the
 *  `<cap-widget>` custom element is registered before render. */
export function ensureWidgetReady() {
  return loadWidgetModule();
}

export const CAP_ENDPOINT = CAP_API_ENDPOINT;
