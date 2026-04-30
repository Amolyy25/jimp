/**
 * Lazy hCaptcha invisible challenge.
 *
 * The script + widget are loaded only on first use (saves ~50KB on every
 * profile that doesn't have a Q&A widget). When `VITE_HCAPTCHA_SITE_KEY` is
 * unset we no-op and return `null` — the server skips verification in
 * that mode too, so dev / preview just works.
 */

const SCRIPT_SRC = 'https://js.hcaptcha.com/1/api.js?render=invisible';

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
  if (!siteKey) return null;

  try {
    const hcaptcha = await loadScript();
    if (!hcaptcha?.execute) return null;

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
      widgetId = hcaptcha.render(host, { sitekey: siteKey, size: 'invisible' });
      host.dataset.widgetId = String(widgetId);
    }

    return await hcaptcha.execute(widgetId, { async: true }).then((r) => r?.response || null);
  } catch (err) {
    console.warn('[captcha] failed:', err);
    return null;
  }
}
