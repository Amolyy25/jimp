import { useEffect, useRef, useState } from 'react';
import { CAP_ENDPOINT, ensureWidgetReady, isCaptchaEnabled } from '../utils/captcha.js';

/**
 * Visible CAP captcha for auth forms.
 *
 * Renders the `<cap-widget>` custom element, listens for the `solve` event,
 * and surfaces the resulting token via `onSolve`. Returns `null` when CAP
 * is disabled (VITE_CAP_ENABLED unset) — caller should treat that as
 * "no token required".
 */
export default function CapCaptcha({ onSolve, onError, onReset, className = '' }) {
  const ref = useRef(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    ensureWidgetReady().then(() => {
      if (!cancelled) setReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!ready) return undefined;
    const el = ref.current;
    if (!el) return undefined;
    const handleSolve = (e) => {
      console.log('[CapCaptcha] solve event:', e.detail);
      const token = e.detail?.token;
      if (token) onSolve?.(token);
    };
    const handleError = (e) => {
      console.error('[CapCaptcha] error event:', e.detail);
      onError?.(e.detail);
    };
    const handleReset = () => {
      console.log('[CapCaptcha] reset event');
      onReset?.();
    };
    el.addEventListener('solve', handleSolve);
    el.addEventListener('error', handleError);
    el.addEventListener('reset', handleReset);
    return () => {
      el.removeEventListener('solve', handleSolve);
      el.removeEventListener('error', handleError);
      el.removeEventListener('reset', handleReset);
    };
  }, [ready, onSolve, onError, onReset]);

  if (!isCaptchaEnabled()) return null;

  return (
    <div className={className}>
      <cap-widget ref={ref} data-cap-api-endpoint={CAP_ENDPOINT} />
    </div>
  );
}
