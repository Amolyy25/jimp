import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Zap } from 'lucide-react';

/**
 * AuthLayout — split-screen shell shared by Login and Register.
 *
 *   ┌─────────────┬───────────────────┐
 *   │   brand     │       form        │
 *   │   moment    │       pane        │
 *   └─────────────┴───────────────────┘
 *
 * Left pane ("brand moment"): rotating, terminal-flavoured showcase of what
 * you get once you're in. Decorative, dark gamer/editorial tone.
 * Right pane: the actual form, styled to match the landing.
 *
 * On narrow viewports the two collapse into a single column (form-only with
 * a compact brand strip on top) so the form stays one-tap reachable.
 */
export default function AuthLayout({ title, subtitle, children, footer }) {
  return (
    <div className="relative flex min-h-screen flex-col bg-[#050505] text-white lg:flex-row">
      <BrandPane />

      <main className="relative flex flex-1 items-center justify-center px-6 py-10 lg:py-16">
        <GridFade />

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="relative z-10 w-full max-w-md"
        >
          <Link
            to="/"
            className="mb-10 inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.24em] text-white/40 transition hover:text-white"
          >
            <ArrowLeft className="h-3 w-3" />
            Back to home
          </Link>

          <header className="mb-8">
            <h1
              className="text-[13vw] font-black leading-[0.88] tracking-[-0.02em] sm:text-[5.5rem]"
              style={{ fontFamily: 'Bebas Neue' }}
            >
              {title}
            </h1>
            {subtitle && (
              <p className="mt-4 max-w-sm text-sm leading-relaxed text-white/50">
                {subtitle}
              </p>
            )}
          </header>

          <div className="space-y-6">{children}</div>

          {footer && <div className="mt-8 text-center">{footer}</div>}
        </motion.div>

        <p className="absolute bottom-6 left-1/2 -translate-x-1/2 font-mono text-[10px] uppercase tracking-[0.24em] text-white/20">
          © 2026 persn.me / Built in France
        </p>
      </main>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* LEFT BRAND PANE                                                            */
/* -------------------------------------------------------------------------- */

const ROTATING_STATS = [
  { label: 'Profiles shipped', value: '14,208' },
  { label: 'Widgets dragged today', value: '62,091' },
  { label: 'Tracks synced', value: '8,304' },
  { label: 'Avg. time to first link', value: '32s' },
];

const ROTATING_QUOTES = [
  '"Looks like a page I actually wanted to make."',
  '"The drag-and-drop just feels right."',
  '"Finally, a Linktree alternative that doesn\'t suck."',
  '"I replaced my whole Discord bio with one link."',
];

function BrandPane() {
  const [qIdx, setQIdx] = useState(0);
  const [sIdx, setSIdx] = useState(0);

  useEffect(() => {
    const q = setInterval(
      () => setQIdx((i) => (i + 1) % ROTATING_QUOTES.length),
      4200,
    );
    const s = setInterval(
      () => setSIdx((i) => (i + 1) % ROTATING_STATS.length),
      2800,
    );
    return () => {
      clearInterval(q);
      clearInterval(s);
    };
  }, []);

  return (
    <aside className="relative hidden w-full overflow-hidden border-r border-white/5 bg-[#080808] lg:flex lg:w-[42%] lg:flex-col">
      {/* Gradient orbs */}
      <div className="pointer-events-none absolute -left-40 top-1/3 h-[500px] w-[500px] rounded-full bg-discord/15 blur-3xl" />
      <div className="pointer-events-none absolute -right-20 bottom-0 h-[400px] w-[400px] rounded-full bg-violet-600/10 blur-3xl" />

      {/* Fine grid */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.05]"
        style={{
          backgroundImage:
            'repeating-linear-gradient(0deg, white 0 1px, transparent 1px 48px), repeating-linear-gradient(90deg, white 0 1px, transparent 1px 48px)',
        }}
      />

      {/* Content */}
      <div className="relative z-10 flex flex-1 flex-col justify-between p-10 xl:p-14">
        {/* Wordmark */}
        <Link to="/" className="flex items-center gap-2.5">
          <div className="relative flex h-9 w-9 items-center justify-center overflow-hidden rounded-md bg-discord">
            <span
              className="relative z-10 text-lg font-black italic text-white"
              style={{ fontFamily: 'Bebas Neue, Inter' }}
            >
              P
            </span>
            <span className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent" />
          </div>
          <span
            className="text-2xl font-black leading-none tracking-tight"
            style={{ fontFamily: 'Bebas Neue' }}
          >
            PERSN.ME
          </span>
          <span className="font-mono text-[9px] uppercase tracking-[0.24em] text-white/30">
            v2.4
          </span>
        </Link>

        {/* Pull-quote — rotating */}
        <div className="space-y-10">
          <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.24em] text-white/40">
            <span className="h-1 w-4 bg-discord" />
            Creators say
          </div>

          <div className="relative h-[220px]">
            <AnimatePresence mode="wait">
              <motion.blockquote
                key={qIdx}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                className="absolute inset-0 flex"
              >
                <p
                  className="text-[2.6rem] font-black leading-[0.98] tracking-[-0.01em] text-white/90 xl:text-[3.2rem]"
                  style={{ fontFamily: 'Bebas Neue' }}
                >
                  {ROTATING_QUOTES[qIdx]}
                </p>
              </motion.blockquote>
            </AnimatePresence>
          </div>

          {/* Terminal-style stat panel */}
          <div className="rounded-xl border border-white/5 bg-black/40 backdrop-blur">
            <div className="flex items-center justify-between border-b border-white/5 px-4 py-2">
              <div className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-green-400" />
                <span className="font-mono text-[9px] uppercase tracking-[0.22em] text-white/40">
                  Live
                </span>
              </div>
              <span className="font-mono text-[9px] uppercase tracking-[0.22em] text-white/30">
                persn.stats
              </span>
            </div>
            <div className="relative h-[68px] overflow-hidden px-4 py-3">
              <AnimatePresence mode="wait">
                <motion.div
                  key={sIdx}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.4 }}
                  className="absolute inset-x-4 top-3"
                >
                  <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-white/40">
                    {ROTATING_STATS[sIdx].label}
                  </div>
                  <div
                    className="text-3xl font-black leading-none tracking-tight tabular-nums text-white"
                    style={{ fontFamily: 'Bebas Neue' }}
                  >
                    {ROTATING_STATS[sIdx].value}
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* Bottom features tag */}
        <div className="flex flex-wrap items-center gap-2 font-mono text-[10px] uppercase tracking-[0.22em] text-white/30">
          <Zap className="h-3 w-3 text-discord" />
          <span>Drag-drop</span>
          <span className="text-white/15">/</span>
          <span>Music sync</span>
          <span className="text-white/15">/</span>
          <span>Vanity URL</span>
          <span className="text-white/15">/</span>
          <span>Free forever</span>
        </div>
      </div>
    </aside>
  );
}

function GridFade() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 z-0 opacity-[0.035]"
      style={{
        backgroundImage:
          'repeating-linear-gradient(0deg, white 0 1px, transparent 1px 48px), repeating-linear-gradient(90deg, white 0 1px, transparent 1px 48px)',
      }}
    />
  );
}
