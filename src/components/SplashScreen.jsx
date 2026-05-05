import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * Click-to-enter gate shown over the profile before content reveals.
 *
 * Why this exists:
 *   - It's the signature visual of bio/profile sites (gunz.lol, guns.lol…).
 *   - The click is a real user gesture → unlocks the browser's autoplay
 *     policy, so background music starts reliably.
 *
 * The text auto-types on mount. Clicking anywhere dismisses it.
 */
export default function SplashScreen({
  text = 'Click to enter',
  subtitle = '',
  accent = '#5865F2',
  accentCss,
  config,
  onDismiss,
  onEnter,
}) {
  const splash = config || {};
  const template = splash.template || 'classic';
  const badge = splash.badge || 'Enter profile';
  const hint = splash.hint || 'Click anywhere';
  const intensity = Math.max(0, Math.min(1, (splash.intensity ?? 60) / 100));
  const showGrid = splash.showGrid ?? true;
  const showFooter = splash.showFooter ?? true;
  // Tolerate the legacy shape where `accent` was the raw theme object — keep
  // the splash colour-aware even before the caller migrates to passing the
  // resolved hex/css pair.
  const accentHex =
    typeof accent === 'string'
      ? accent
      : accent?.kind === 'gradient'
        ? accent.from || '#5865F2'
        : accent?.value || '#5865F2';
  const accentBackground =
    accentCss ||
    (typeof accent === 'object' && accent?.kind === 'gradient'
      ? `linear-gradient(${accent.angle ?? 135}deg, ${accent.from || accentHex} 0%, ${accent.to || accentHex} 100%)`
      : accentHex);
  const tint = (hex, alpha) => {
    if (!hex || typeof hex !== 'string' || !hex.startsWith('#')) {
      return `rgba(88,101,242,${alpha})`;
    }
    let h = hex.slice(1);
    if (h.length === 3) h = h.split('').map((c) => c + c).join('');
    const r = parseInt(h.slice(0, 2), 16);
    const g = parseInt(h.slice(2, 4), 16);
    const b = parseInt(h.slice(4, 6), 16);
    return `rgba(${r},${g},${b},${alpha})`;
  };
  const [visible, setVisible] = useState(true);
  const typed = useTypewriter(text, 45);
  const templateTone = {
    classic: {
      titleClass: 'text-[11vw] font-black leading-[0.88] tracking-[-0.02em] text-white sm:text-[6rem]',
      titleStyle: { fontFamily: 'Bebas Neue, Inter' },
      badgeClass: 'font-mono text-[10px] uppercase tracking-[0.32em] text-white/40',
      subtitleClass: 'max-w-md text-sm font-light leading-relaxed text-white/50',
      panelClass: 'relative flex flex-col items-center gap-6 px-8 text-center',
    },
    terminal: {
      titleClass: 'text-[9vw] font-bold leading-[0.96] tracking-[-0.01em] text-white sm:text-[4.8rem]',
      titleStyle: { fontFamily: 'JetBrains Mono, monospace', color: accentHex, textShadow: `0 0 18px ${tint(accentHex, 0.4)}` },
      badgeClass: 'font-mono text-[10px] uppercase tracking-[0.32em] text-white/55',
      subtitleClass: 'max-w-xl font-mono text-xs leading-7 text-white/55',
      panelClass: 'relative flex w-full max-w-3xl flex-col items-center gap-6 rounded-[28px] border border-white/10 bg-black/45 px-8 py-10 text-center backdrop-blur-xl',
    },
    spotlight: {
      titleClass: 'text-[10vw] font-semibold leading-[0.92] tracking-[-0.03em] text-white sm:text-[5.8rem]',
      titleStyle: { fontFamily: 'Playfair Display, serif' },
      badgeClass: 'text-[10px] uppercase tracking-[0.38em] text-white/45',
      subtitleClass: 'max-w-lg text-sm italic leading-relaxed text-white/58',
      panelClass: 'relative flex flex-col items-center gap-6 px-8 text-center',
    },
    arcade: {
      titleClass: 'text-[9vw] font-black leading-[0.9] tracking-[0.04em] text-white sm:text-[5rem]',
      titleStyle: { fontFamily: 'JetBrains Mono, monospace', textShadow: `0 0 26px ${tint(accentHex, 0.28)}` },
      badgeClass: 'font-mono text-[10px] uppercase tracking-[0.34em] text-white/55',
      subtitleClass: 'max-w-md text-xs uppercase tracking-[0.2em] text-white/55',
      panelClass: 'relative flex w-full max-w-2xl flex-col items-center gap-6 rounded-[30px] border border-white/10 bg-black/35 px-8 py-10 text-center shadow-2xl backdrop-blur-lg',
    },
  }[template] || {
    titleClass: 'text-[11vw] font-black leading-[0.88] tracking-[-0.02em] text-white sm:text-[6rem]',
    titleStyle: { fontFamily: 'Bebas Neue, Inter' },
    badgeClass: 'font-mono text-[10px] uppercase tracking-[0.32em] text-white/40',
    subtitleClass: 'max-w-md text-sm font-light leading-relaxed text-white/50',
    panelClass: 'relative flex flex-col items-center gap-6 px-8 text-center',
  };

  // Allow dismiss via any key too — keyboards & touchpads.
  useEffect(() => {
    if (!visible) return;
    const onKey = () => {
      setVisible(false);
      onEnter?.();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [visible, onEnter]);

  const handleClick = () => {
    setVisible(false);
    onEnter?.();
  };

  return (
    <AnimatePresence onExitComplete={onDismiss}>
      {visible && (
        <motion.div
          key="splash"
          role="button"
          tabIndex={0}
          onClick={handleClick}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, filter: 'blur(12px)' }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          className="fixed inset-0 z-[100] flex cursor-pointer flex-col items-center justify-center overflow-hidden bg-black"
        >
          {template === 'spotlight' && (
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 opacity-80"
              style={{
                background: `radial-gradient(circle at 50% 28%, ${tint(accentHex, 0.16 + (intensity * 0.22))} 0%, rgba(255,255,255,0.02) 22%, rgba(0,0,0,0.88) 68%)`,
              }}
            />
          )}
          {template === 'terminal' && (
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 opacity-[0.06]"
              style={{
                backgroundImage: 'repeating-linear-gradient(180deg, rgba(255,255,255,0.9) 0 1px, transparent 1px 4px)',
              }}
            />
          )}
          {template === 'arcade' && (
            <>
              <div
                aria-hidden
                className="pointer-events-none absolute inset-x-0 top-0 h-1"
                style={{ background: accentBackground, boxShadow: `0 0 28px ${tint(accentHex, 0.55)}` }}
              />
              <div
                aria-hidden
                className="pointer-events-none absolute inset-x-0 bottom-0 h-1"
                style={{ background: accentBackground, boxShadow: `0 0 28px ${tint(accentHex, 0.55)}` }}
              />
            </>
          )}
          {/* Radial accent glow — picks up the user's theme accent, gradient
              or solid. We render it through a low-opacity wrapper so a vivid
              gradient stays in the splash mood (deep, atmospheric) instead of
              looking like a flat colour wash. */}
          <div
            aria-hidden
            className="pointer-events-none absolute h-[700px] w-[700px] rounded-full blur-[140px]"
            style={{ background: accentBackground, opacity: 0.14 + (intensity * 0.26) }}
          />
          {showGrid && (
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0"
              style={{
                opacity: template === 'arcade' ? 0.07 : 0.04 + (intensity * 0.04),
                backgroundImage:
                  'repeating-linear-gradient(0deg, white 0 1px, transparent 1px 48px), repeating-linear-gradient(90deg, white 0 1px, transparent 1px 48px)',
              }}
            />
          )}

          <div className={templateTone.panelClass}>
            {template === 'arcade' && (
              <div
                aria-hidden
                className="pointer-events-none absolute inset-0 rounded-[inherit]"
                style={{
                  boxShadow: `inset 0 0 0 1px ${tint(accentHex, 0.32)}, 0 0 60px ${tint(accentHex, 0.16)}`,
                }}
              />
            )}
            <div className={`flex items-center gap-2 ${templateTone.badgeClass}`}>
              <span
                className="inline-block h-1.5 w-1.5 animate-pulse rounded-full"
                style={{ background: accentBackground }}
              />
              {template === 'terminal' ? `> ${badge}` : badge}
            </div>

            <h1
              className={templateTone.titleClass}
              style={templateTone.titleStyle}
            >
              {template === 'terminal' && <span className="mr-3 text-white/45">$</span>}
              {typed}
              <span
                className="inline-block w-[0.08em] animate-pulse"
                style={{ background: accentBackground, height: '0.8em' }}
                aria-hidden
              >
                &nbsp;
              </span>
            </h1>

            {subtitle && (
              <p className={templateTone.subtitleClass}>
                {subtitle}
              </p>
            )}

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8, duration: 0.5 }}
              className="mt-4 flex items-center gap-3 rounded-full border border-white/10 bg-white/[0.03] px-4 py-2 backdrop-blur-md"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="currentColor"
                className="text-white/60"
              >
                <path d="M9 3H5a2 2 0 0 0-2 2v4h2V5h4V3zm10 0h-4v2h4v4h2V5a2 2 0 0 0-2-2zM5 15H3v4a2 2 0 0 0 2 2h4v-2H5v-4zm16 0h-2v4h-4v2h4a2 2 0 0 0 2-2v-4z" />
              </svg>
              <span className="font-mono text-[10px] uppercase tracking-[0.24em] text-white/60">
                {hint}
              </span>
            </motion.div>
          </div>

          {/* Tiny footer — made-with signature works on the gate too */}
          {showFooter && (
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 font-mono text-[10px] uppercase tracking-[0.24em] text-white/20">
              made with persn.me
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/**
 * Minimal typewriter — types the string out, char by char, then stops.
 * Exposed as a hook so other pieces (e.g. CTAs) can share the treatment.
 */
function useTypewriter(text, speedMs = 40) {
  const [out, setOut] = useState('');
  useEffect(() => {
    setOut('');
    let i = 0;
    const id = setInterval(() => {
      i += 1;
      setOut(text.slice(0, i));
      if (i >= text.length) clearInterval(id);
    }, speedMs);
    return () => clearInterval(id);
  }, [text, speedMs]);
  return out;
}
