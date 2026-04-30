/**
 * Lazy hCaptcha invisible challenge.
 *
 * The script + widget are loaded only on first use (saves ~50KB on every
 * profile that doesn't have a Q&A widget). When `VITE_HCAPTCHA_SITE_KEY` is
 * unset we no-op and return `null` — the server skips verification in
 * that mode too, so dev / preview just works.
 */

// `render=explicit` keeps the API from auto-rendering anything — we call
// hcaptcha.render() ourselves with size: 'invisible' below. Don't use
// `render=invisible` (not a valid value despite what some old gists say).
const SCRIPT_SRC = 'https://js.hcaptcha.com/1/api.js?render=explicit';

let scriptPromise = null;

function loadScript() {
  if (scriptPromise) return scriptPromise;
  scriptPromise = new Promise((resolve, reject) => {
    if (typeof window === 'undefined') return reject(new Error('No window'));
    if (window.hcaptcha) return resolve(window.hcaptcha);
    const s = document.createElement('script');
    s.src = SCRIPT_SRC;
    s.async = true;
    s.defer = true;
    s.onload = () => resolve(window.hcaptcha);
    s.onerror = () => reject(new Error('hCaptcha script failed to load'));
    document.head.appendChild(s);
  });
  return scriptPromise;
}

export function isCaptchaEnabled() {
  return Boolean(import.meta.env.VITE_HCAPTCHA_SITE_KEY);
}

/**
 * Run an invisible challenge and return a verification token, or `null` if
 * the captcha is disabled / errored. We return `null` rather than throwing
 * because the server gracefully accepts a missing token when the secret
 * isn't configured, so the UI can still proceed.
 */
export async function getCaptchaToken() {
  const siteKey = import.meta.env.VITE_HCAPTCHA_SITE_KEY;
  if (!siteKey) {
    console.warn('[captcha] VITE_HCAPTCHA_SITE_KEY missing — skipping. (If your server has HCAPTCHA_SECRET set, submissions WILL fail with 403.)');
    return null;
  }

  try {
    const hcaptcha = await loadScript();
    if (!hcaptcha?.execute) {
      console.warn('[captcha] script loaded but window.hcaptcha is missing');
      return null;
    }

    // Render an off-screen invisible widget once per page lifecycle.
    let host = document.getElementById('persn-hcaptcha-host');
    if (!host) {
      host = document.createElement('div');
      host.id = 'persn-hcaptcha-host';
      host.style.position = 'fixed';
      host.style.bottom = '0';
      host.style.right = '0';
      host.style.width = '0';
      host.style.height = '0';
      host.style.overflow = 'hidden';
      host.style.pointerEvents = 'none';
      document.body.appendChild(host);
    }

    let widgetId = host.dataset.widgetId;
    if (!widgetId) {
      try {
        widgetId = hcaptcha.render(host, { sitekey: siteKey, size: 'invisible' });
        host.dataset.widgetId = String(widgetId);
      } catch (renderErr) {
        // Most often: hostname not whitelisted in the hCaptcha dashboard.
        console.error('[captcha] render failed:', renderErr, '— check hostnames at dashboard.hcaptcha.com');
        return null;
      }
    }

    const result = await hcaptcha.execute(widgetId, { async: true });
    const token = result?.response || null;
    if (!token) console.warn('[captcha] execute returned no token:', result);
    return token;
  } catch (err) {
    console.error('[captcha] failed:', err);
    return null;
  }
}
