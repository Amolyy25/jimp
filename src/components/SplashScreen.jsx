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
  onDismiss,
  onEnter,
}) {
  const [visible, setVisible] = useState(true);
  const typed = useTypewriter(text, 45);

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
          {/* Radial accent glow */}
          <div
            aria-hidden
            className="pointer-events-none absolute h-[700px] w-[700px] rounded-full blur-[140px]"
            style={{ background: `${accent}30` }}
          />
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-[0.04]"
            style={{
              backgroundImage:
                'repeating-linear-gradient(0deg, white 0 1px, transparent 1px 48px), repeating-linear-gradient(90deg, white 0 1px, transparent 1px 48px)',
            }}
          />

          <div className="relative flex flex-col items-center gap-6 px-8 text-center">
            <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.32em] text-white/40">
              <span
                className="inline-block h-1.5 w-1.5 animate-pulse rounded-full"
                style={{ background: accent }}
              />
              Enter profile
            </div>

            <h1
              className="text-[11vw] font-black leading-[0.88] tracking-[-0.02em] text-white sm:text-[6rem]"
              style={{ fontFamily: 'Bebas Neue, Inter' }}
            >
              {typed}
              <span
                className="inline-block w-[0.08em] animate-pulse"
                style={{ background: accent, height: '0.8em' }}
                aria-hidden
              >
                &nbsp;
              </span>
            </h1>

            {subtitle && (
              <p className="max-w-md text-sm font-light leading-relaxed text-white/50">
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
                Click anywhere
              </span>
            </motion.div>
          </div>

          {/* Tiny footer — made-with signature works on the gate too */}
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 font-mono text-[10px] uppercase tracking-[0.24em] text-white/20">
            made with persn.me
          </div>
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
