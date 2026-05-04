import { useEffect, useRef, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  motion,
  useMotionValue,
  useScroll,
  useSpring,
  useTransform,
  AnimatePresence,
} from 'framer-motion';
import { getExploreFeed, getMe, logout } from '../utils/api.js';
import {
  ArrowUpRight,
  Zap,
  Music,
  Globe,
  Layers,
  Sparkles,
  Gamepad2,
  Command,
  Lock,
  Check,
  MousePointer2,
  Move,
  Link as LinkIcon,
  Eye,
  Palette,
  Plus,
  Minus,
  Hand,
  Pause,
  ChevronRight,
  X,
  Disc,
  Award,
  Share2,
  Cloud,
  MessageSquare,
  HelpCircle,
  Tv,
  Server,
  Activity,
  LayoutGrid,
  Clock,
} from 'lucide-react';
import logo from '../image/logo.jpeg';

/**
 * persn.me landing — bold editorial-gamer-terminal aesthetic.
 *   - Bebas Neue display, JetBrains Mono labels, Outfit body
 *   - Discord violet + electric lime + hot magenta crash accents
 *   - Live, interactive product demos (not just mockups)
 *   - 3D perspective cards with cursor-tracked tilt
 *   - Scroll-triggered reveals + parallax
 */
export default function Landing() {
  const [user, setUser] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const u = await getMe();
      if (cancelled) return;
      setUser(u);
      setAuthChecked(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[#050505] text-white antialiased">
      <ScrollProgress />
      <Cursor />
      <GridBackdrop />
      <Spotlight />
      <Grain />

      <Nav user={user} authChecked={authChecked} onSignOut={async () => { await logout(); setUser(null); }} />

      <Hero user={user} />
      <Stats />
      <Marquee />
      <CanvasShowcase />
      <ProfileWall />
      <Features />
      <HowItWorks />
      <Comparison />
      <Faq />
      <FinalCta user={user} />
      <Footer />

      <style>{styles}</style>
    </div>
  );
}

/* ============================================================ */
/* GLOBAL STYLES                                                 */
/* ============================================================ */

const styles = `
  :root {
    --discord: #5865F2;
    --lime: #c0ff3e;
    --magenta: #ff2e88;
    --paper: #f4f0e6;
  }
  @keyframes marquee {
    from { transform: translateX(0); }
    to   { transform: translateX(-50%); }
  }
  @keyframes pulse-ring {
    0%   { transform: scale(0.95); opacity: 0.6; }
    70%  { transform: scale(1.4);  opacity: 0;   }
    100% { transform: scale(1.4);  opacity: 0;   }
  }
  @keyframes scan {
    0%   { transform: translateY(-100%); }
    100% { transform: translateY(100%);  }
  }
  @keyframes blink {
    0%, 49% { opacity: 1; }
    50%, 100% { opacity: 0; }
  }
  @keyframes float-y {
    0%, 100% { transform: translateY(0); }
    50%      { transform: translateY(-6px); }
  }
  @keyframes drift {
    0%   { transform: translate(0, 0); }
    25%  { transform: translate(8px, -4px); }
    50%  { transform: translate(0, -8px); }
    75%  { transform: translate(-8px, -4px); }
    100% { transform: translate(0, 0); }
  }
  .font-display { font-family: 'Bebas Neue', sans-serif; letter-spacing: -0.01em; }
  .font-mono-tight { font-family: 'JetBrains Mono', monospace; }
  .font-body { font-family: 'Outfit', 'Inter', sans-serif; }
  .text-balance { text-wrap: balance; }
  .ring-gradient {
    background: conic-gradient(from 0deg, var(--discord), var(--magenta), var(--lime), var(--discord));
  }
  .glass {
    background: rgba(255, 255, 255, 0.025);
    backdrop-filter: blur(14px) saturate(160%);
    -webkit-backdrop-filter: blur(14px) saturate(160%);
  }
  .scan-bar {
    position: absolute; inset: 0;
    background: linear-gradient(180deg, transparent 0%, rgba(192, 255, 62, 0.06) 50%, transparent 100%);
    height: 35%;
    animation: scan 6s linear infinite;
    pointer-events: none;
  }
`;

/* ============================================================ */
/* CHROME — scroll progress, custom cursor halo                  */
/* ============================================================ */

function ScrollProgress() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 200, damping: 30 });
  return (
    <motion.div
      style={{ scaleX, transformOrigin: '0% 50%' }}
      className="fixed left-0 right-0 top-0 z-[100] h-[2px] bg-gradient-to-r from-[var(--discord)] via-[var(--magenta)] to-[var(--lime)]"
    />
  );
}

function Cursor() {
  const [pos, setPos] = useState({ x: -100, y: -100 });
  useEffect(() => {
    const onMove = (e) => setPos({ x: e.clientX, y: e.clientY });
    window.addEventListener('mousemove', onMove);
    return () => window.removeEventListener('mousemove', onMove);
  }, []);
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed z-[2] h-[300px] w-[300px] rounded-full opacity-50 mix-blend-screen blur-[80px]"
      style={{
        left: pos.x - 150,
        top: pos.y - 150,
        background:
          'radial-gradient(circle, rgba(88,101,242,0.45) 0%, transparent 70%)',
        transition: 'transform 80ms linear',
      }}
    />
  );
}

function GridBackdrop() {
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-0 opacity-[0.04]"
      style={{
        backgroundImage:
          'repeating-linear-gradient(0deg, white 0 1px, transparent 1px 56px), repeating-linear-gradient(90deg, white 0 1px, transparent 1px 56px)',
      }}
    />
  );
}

function Spotlight() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-0">
      <div className="absolute -top-40 left-1/2 h-[700px] w-[900px] -translate-x-1/2 rounded-full bg-[var(--discord)]/10 blur-[140px]" />
      <div className="absolute bottom-[-10%] right-[-10%] h-[500px] w-[500px] rounded-full bg-[var(--magenta)]/[0.04] blur-[140px]" />
      <div className="absolute top-[40%] left-[-10%] h-[400px] w-[400px] rounded-full bg-[var(--lime)]/[0.03] blur-[140px]" />
    </div>
  );
}

function Grain() {
  return (
    <svg
      aria-hidden
      className="pointer-events-none fixed inset-0 z-[1] h-full w-full opacity-[0.06] mix-blend-overlay"
    >
      <filter id="noise">
        <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" stitchTiles="stitch" />
        <feColorMatrix type="saturate" values="0" />
      </filter>
      <rect width="100%" height="100%" filter="url(#noise)" />
    </svg>
  );
}

/* ============================================================ */
/* NAV                                                           */
/* ============================================================ */

function Nav({ user, authChecked, onSignOut }) {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 30);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <nav
      className={[
        'fixed left-0 right-0 top-0 z-50 transition-all duration-500',
        scrolled
          ? 'border-b border-white/[0.06] bg-black/70 backdrop-blur-2xl'
          : 'border-b border-transparent bg-transparent',
      ].join(' ')}
    >
      <div className="mx-auto flex max-w-[1440px] items-center justify-between px-6 py-3.5">
        <Wordmark />
        <div className="hidden items-center gap-9 md:flex">
          <NavLink href="#features">Features</NavLink>
          <NavLink href="#how">How it works</NavLink>
          <NavLink href="#compare">vs. The rest</NavLink>
          <NavLink href="/explore" isExternal>
            Explore
          </NavLink>
        </div>
        <div className="flex items-center gap-2">
          {!authChecked ? (
            <div className="h-9 w-32 animate-pulse rounded-md bg-white/[0.04]" />
          ) : user ? (
            <UserMenu user={user} onSignOut={onSignOut} />
          ) : (
            <>
              <Link
                to="/login"
                className="hidden h-9 items-center px-3 font-mono-tight text-[10px] font-medium uppercase tracking-[0.22em] text-white/60 transition hover:text-white sm:flex"
              >
                Sign in
              </Link>
              <Link
                to="/register"
                className="group relative flex h-9 items-center gap-1.5 overflow-hidden rounded-md bg-white px-3.5 font-mono-tight text-[10px] font-bold uppercase tracking-[0.22em] text-black transition"
              >
                <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-[var(--lime)] via-[var(--discord)] to-[var(--magenta)] transition-transform duration-500 group-hover:translate-x-0" />
                <span className="relative">Get Started</span>
                <ArrowUpRight className="relative h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}

function UserMenu({ user, onSignOut }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return;
    const onDoc = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  const initial = (user.username || '?').charAt(0).toUpperCase();

  return (
    <div ref={ref} className="relative flex items-center gap-2">
      <Link
        to="/editor"
        className="group relative hidden h-9 items-center gap-1.5 overflow-hidden rounded-md bg-white px-3.5 font-mono-tight text-[10px] font-bold uppercase tracking-[0.22em] text-black transition sm:flex"
      >
        <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-[var(--lime)] via-[var(--discord)] to-[var(--magenta)] transition-transform duration-500 group-hover:translate-x-0" />
        <span className="relative">Open editor</span>
        <ArrowUpRight className="relative h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
      </Link>

      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={[
          'flex h-9 items-center gap-2 rounded-full border bg-white/[0.03] py-1 pl-1 pr-3 transition',
          open
            ? 'border-white/25 bg-white/[0.06]'
            : 'border-white/10 hover:border-white/20 hover:bg-white/[0.05]',
        ].join(' ')}
      >
        <span className="relative flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-black ring-1 ring-white/15"
          style={{
            background: 'linear-gradient(135deg, var(--discord), var(--magenta))',
            fontFamily: 'Bebas Neue',
          }}
        >
          {initial}
          <span className="absolute -bottom-0 -right-0 h-2 w-2 rounded-full bg-[var(--lime)] ring-2 ring-[#050505] shadow-[0_0_6px_var(--lime)]" />
        </span>
        <span className="hidden flex-col items-start leading-none sm:flex">
          <span className="font-mono-tight text-[8px] uppercase tracking-[0.22em] text-[var(--lime)]">
            online
          </span>
          <span className="mt-0.5 max-w-[120px] truncate text-[12px] font-semibold">
            @{user.username}
          </span>
        </span>
        <ChevronRight
          className={[
            'h-3.5 w-3.5 text-white/45 transition-transform',
            open ? 'rotate-90' : 'rotate-90',
          ].join(' ')}
        />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
            className="absolute right-0 top-[110%] w-64 overflow-hidden rounded-xl border border-white/10 bg-black/90 p-1.5 shadow-[0_30px_70px_rgba(0,0,0,0.55)] backdrop-blur-2xl"
          >
            <div className="border-b border-white/[0.06] px-3 py-3">
              <div className="font-mono-tight text-[8px] uppercase tracking-[0.22em] text-white/40">
                Signed in as
              </div>
              <div className="mt-0.5 truncate text-[13px] font-semibold">
                @{user.username}
              </div>
              <div className="truncate font-mono-tight text-[10px] text-white/40">
                {user.email}
              </div>
            </div>
            <MenuItem to="/editor" icon={Layers} label="My profile" hint="Editor" />
            <MenuItem to="/analytique" icon={Activity} label="Analytics" />
            <MenuItem to="/explore" icon={Eye} label="Explore the wall" />
            <div className="my-1 h-px bg-white/[0.06]" />
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                onSignOut?.();
              }}
              className="flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-left transition hover:bg-white/[0.05]"
            >
              <X className="h-3.5 w-3.5 text-white/55" />
              <span className="font-mono-tight text-[11px] uppercase tracking-[0.18em] text-white/70">
                Sign out
              </span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function MenuItem({ to, icon: Icon, label, hint }) {
  return (
    <Link
      to={to}
      className="group/m flex items-center gap-2.5 rounded-md px-3 py-2 transition hover:bg-white/[0.05]"
    >
      <Icon className="h-3.5 w-3.5 text-white/55" />
      <span className="flex-1 text-[13px] text-white/80 transition group-hover/m:text-white">
        {label}
      </span>
      {hint && (
        <span className="font-mono-tight text-[8px] uppercase tracking-[0.22em] text-white/30">
          {hint}
        </span>
      )}
      <ArrowUpRight className="h-3.5 w-3.5 text-white/25 transition group-hover/m:text-white/70" />
    </Link>
  );
}

function NavLink({ href, children, isExternal }) {
  const cls =
    "relative font-mono-tight text-[10px] font-medium uppercase tracking-[0.22em] text-white/55 transition hover:text-white before:absolute before:-bottom-1 before:left-0 before:h-px before:w-0 before:bg-[var(--discord)] before:transition-all hover:before:w-full";
  if (isExternal) {
    return (
      <Link to={href} className={cls}>
        {children}
      </Link>
    );
  }
  return (
    <a href={href} className={cls}>
      {children}
    </a>
  );
}

function Wordmark() {
  return (
    <Link to="/" className="group flex items-center gap-2.5">
      <div className="relative h-8 w-8">
        <div className="absolute inset-0 rounded-md bg-gradient-to-br from-[var(--discord)] to-[var(--magenta)] opacity-0 blur-md transition-opacity group-hover:opacity-100" />
        <img
          src={logo}
          alt="persn.me"
          className="relative h-8 w-8 rounded-md object-cover ring-1 ring-white/10"
        />
      </div>
      <div className="flex items-baseline gap-2">
        <span className="font-display text-xl font-black leading-none">PERSN.ME</span>
        <span className="hidden font-mono-tight text-[9px] uppercase tracking-[0.24em] text-white/30 sm:inline">
          v2.4
        </span>
      </div>
    </Link>
  );
}

/* ============================================================ */
/* HERO                                                          */
/* ============================================================ */

function Hero({ user }) {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start start', 'end start'],
  });
  const yMockup = useTransform(scrollYProgress, [0, 1], [0, -60]);
  const yLabel = useTransform(scrollYProgress, [0, 1], [0, -40]);

  return (
    <section ref={ref} className="relative pb-20 pt-32 lg:pt-44 lg:pb-28">
      <div className="mx-auto grid max-w-[1440px] grid-cols-1 gap-14 px-6 lg:grid-cols-12 lg:gap-10">
        <div className="relative lg:col-span-7">
          <motion.div
            initial="hidden"
            animate="show"
            variants={{
              hidden: {},
              show: { transition: { staggerChildren: 0.07, delayChildren: 0.05 } },
            }}
            className="space-y-9"
          >
            <motion.div
              variants={fadeUp}
              style={{ y: yLabel }}
              className="flex items-center gap-3"
            >
              <span className="relative flex h-2 w-2">
                <span className="absolute inset-0 animate-[pulse-ring_2s_ease-out_infinite] rounded-full bg-[var(--lime)]" />
                <span className="relative h-2 w-2 rounded-full bg-[var(--lime)] shadow-[0_0_12px_var(--lime)]" />
              </span>
              <span className="font-mono-tight text-[10px] uppercase tracking-[0.26em] text-white/55">
                Live · Profile builder · v2.4
              </span>
              <span className="hidden h-3 w-px bg-white/15 md:block" />
              <span className="hidden font-mono-tight text-[10px] uppercase tracking-[0.26em] text-white/35 md:inline">
                12,438 profiles shipped
              </span>
            </motion.div>

            <motion.h1
              variants={fadeUp}
              className="font-display text-[14vw] font-black leading-[0.84] tracking-[-0.02em] sm:text-[10rem] lg:text-[10.5rem]"
            >
              <span className="block">A PROFILE</span>
              <span className="block">
                <span className="italic" style={{ fontFamily: 'Playfair Display' }}>
                  that<span className="not-italic font-display"> </span>
                </span>
                <span className="relative inline-block align-baseline">
                  <span className="relative z-10 bg-gradient-to-br from-white via-white to-[var(--discord)] bg-clip-text text-transparent">
                    SLAPS.
                  </span>
                  <svg
                    aria-hidden
                    viewBox="0 0 200 12"
                    className="absolute -bottom-2 left-0 h-3 w-full"
                    preserveAspectRatio="none"
                  >
                    <path
                      d="M0 6 Q 50 0, 100 6 T 200 6"
                      stroke="var(--magenta)"
                      strokeWidth="3"
                      fill="none"
                      strokeLinecap="round"
                    />
                  </svg>
                </span>
              </span>
            </motion.h1>

            <motion.p
              variants={fadeUp}
              className="font-body max-w-lg text-[17px] font-light leading-relaxed text-white/60"
            >
              Drag widgets on a freeform canvas. Pin your music, your games, your
              Discord. Claim <span className="text-white/90">persn.me/yourname</span> —
              flex it everywhere. <span className="text-white/40">No templates. No grids. No bullshit.</span>
            </motion.p>

            {user && (
              <motion.div
                variants={fadeUp}
                className="inline-flex items-center gap-3 rounded-full border border-[var(--lime)]/40 bg-[var(--lime)]/[0.07] py-1.5 pl-1.5 pr-4"
              >
                <span
                  className="flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-black ring-1 ring-white/15"
                  style={{
                    background: 'linear-gradient(135deg, var(--discord), var(--magenta))',
                    fontFamily: 'Bebas Neue',
                  }}
                >
                  {(user.username || '?').charAt(0).toUpperCase()}
                </span>
                <span className="flex flex-col leading-none">
                  <span className="font-mono-tight text-[8px] uppercase tracking-[0.22em] text-[var(--lime)]">
                    you're signed in
                  </span>
                  <span className="mt-1 text-[12px] font-semibold text-white">
                    @{user.username}
                  </span>
                </span>
              </motion.div>
            )}

            <motion.div variants={fadeUp} className="flex flex-wrap items-center gap-3">
              <Link
                to="/editor"
                className="group relative flex h-13 items-center gap-2 overflow-hidden rounded-md bg-[var(--discord)] px-6 py-4 font-mono-tight text-[11px] font-bold uppercase tracking-[0.2em] text-white transition"
              >
                <span className="absolute inset-0 bg-gradient-to-r from-[var(--discord)] via-[var(--magenta)] to-[var(--discord)] bg-[length:200%_100%] transition-all duration-700 group-hover:bg-[position:100%_0]" />
                <span className="relative">{user ? 'Open editor →' : 'Build mine →'}</span>
              </Link>
              <Link
                to="/explore"
                className="group flex h-13 items-center gap-2 rounded-md border border-white/10 bg-white/[0.03] px-6 py-4 font-mono-tight text-[11px] font-bold uppercase tracking-[0.2em] text-white/85 backdrop-blur-md transition hover:border-white/25 hover:bg-white/[0.06]"
              >
                <Eye className="h-3.5 w-3.5" />
                See live profiles
              </Link>
            </motion.div>

            <motion.div
              variants={fadeUp}
              className="flex flex-wrap items-center gap-x-8 gap-y-3 pt-3"
            >
              {[
                ['Free forever', Check],
                ['No credit card', Check],
                ['30-second setup', Check],
                ['Discord login', Disc],
              ].map(([label, Icon]) => (
                <span
                  key={label}
                  className="flex items-center gap-1.5 font-mono-tight text-[10px] uppercase tracking-[0.22em] text-white/35"
                >
                  <Icon className="h-3 w-3 text-[var(--lime)]" />
                  {label}
                </span>
              ))}
            </motion.div>
          </motion.div>
        </div>

        <motion.div style={{ y: yMockup }} className="relative lg:col-span-5">
          <HeroMockup />
        </motion.div>
      </div>
    </section>
  );
}

const fadeUp = {
  hidden: { opacity: 0, y: 14 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] },
  },
};

/* ============================================================ */
/* HERO MOCKUP — interactive 3D-tilt fake profile                */
/* ============================================================ */

function HeroMockup() {
  const ref = useRef(null);
  const rx = useMotionValue(0);
  const ry = useMotionValue(0);
  const onMouseMove = (e) => {
    const r = ref.current?.getBoundingClientRect();
    if (!r) return;
    const x = (e.clientX - r.left) / r.width - 0.5;
    const y = (e.clientY - r.top) / r.height - 0.5;
    rx.set(-y * 8);
    ry.set(x * 10);
  };
  const onLeave = () => {
    rx.set(0);
    ry.set(0);
  };

  return (
    <div className="relative mx-auto w-full max-w-[540px] [perspective:1400px] lg:max-w-none">
      <motion.div
        ref={ref}
        onMouseMove={onMouseMove}
        onMouseLeave={onLeave}
        initial={{ opacity: 0, y: 28 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.9, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
        style={{ rotateX: rx, rotateY: ry, transformStyle: 'preserve-3d' }}
        className="relative aspect-[5/6] w-full"
      >
        {/* Tag bar */}
        <div className="absolute -left-2 -top-7 z-20 flex items-center gap-2 font-mono-tight text-[9px] uppercase tracking-[0.24em] text-white/40">
          <span className="h-px w-6 bg-white/30" />
          live preview / persn.me
        </div>

        <div
          className="absolute inset-0 overflow-hidden rounded-[20px] border border-white/10 bg-gradient-to-br from-[#0a0a0a] to-[#050505] shadow-[0_40px_100px_rgba(0,0,0,0.55),0_0_0_1px_rgba(255,255,255,0.04)]"
          style={{ transform: 'translateZ(0)' }}
        >
          {/* Browser chrome */}
          <div className="flex items-center justify-between border-b border-white/[0.07] bg-black/40 px-4 py-2.5">
            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
              <span className="h-2.5 w-2.5 rounded-full bg-white/10" />
              <span className="h-2.5 w-2.5 rounded-full bg-white/10" />
            </div>
            <div className="flex items-center gap-1.5 rounded-sm border border-white/5 bg-white/[0.03] px-2 py-0.5">
              <Lock className="h-2.5 w-2.5 text-[var(--lime)]" />
              <span className="font-mono-tight text-[9px] uppercase tracking-[0.18em] text-white/45">
                persn.me/yourname
              </span>
            </div>
            <div className="w-[34px]" />
          </div>

          <div className="relative h-[calc(100%-38px)] overflow-hidden">
            {/* Atmosphere */}
            <div
              className="absolute inset-0"
              style={{
                background:
                  'radial-gradient(circle at 20% 10%, rgba(88,101,242,0.4), transparent 50%), radial-gradient(circle at 90% 90%, rgba(255,46,136,0.18), transparent 45%)',
              }}
            />
            <div className="absolute inset-0 bg-black/30" />
            <div
              className="absolute inset-0 opacity-[0.07]"
              style={{
                backgroundImage:
                  'repeating-linear-gradient(0deg, white 0 1px, transparent 1px 36px), repeating-linear-gradient(90deg, white 0 1px, transparent 1px 36px)',
              }}
            />

            {/* Identity (top-left) */}
            <motion.div
              {...floatAnim(0)}
              className="absolute left-5 top-5 flex items-start gap-3"
              style={{ transform: 'translateZ(40px)' }}
            >
              <div className="relative">
                <div className="absolute inset-0 -m-1 rounded-full border border-[var(--discord)]/60" />
                <div className="absolute inset-0 -m-2 animate-[pulse-ring_2s_ease-out_infinite] rounded-full border border-[var(--discord)]/40" />
                <div className="relative h-12 w-12 overflow-hidden rounded-full border border-white/10 bg-gradient-to-br from-[var(--magenta)] via-violet-400 to-[var(--discord)]" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-display text-xl font-black tracking-tight text-white">
                    AKARI_X
                  </span>
                  <span
                    className="inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[7px] font-bold uppercase tracking-wider text-white"
                    style={{ background: 'linear-gradient(135deg,#ff73fa,#5865F2,#3ba9ff)' }}
                  >
                    <Zap className="h-2 w-2" /> Nitro
                  </span>
                </div>
                <div className="font-mono-tight text-[8px] uppercase tracking-[0.2em] text-white/45">
                  Tokyo · Streaming
                </div>
              </div>
            </motion.div>

            {/* Local clock chip */}
            <motion.div
              {...floatAnim(1)}
              style={{ transform: 'translateZ(30px)' }}
              className="absolute right-5 top-5 rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-1.5 backdrop-blur-md"
            >
              <div className="font-mono-tight text-[8px] uppercase tracking-[0.18em] text-white/40">
                Local
              </div>
              <div className="font-mono-tight text-sm font-bold tabular-nums">
                <LiveClock />
              </div>
            </motion.div>

            {/* Games rack */}
            <motion.div
              {...floatAnim(2)}
              style={{ transform: 'translateZ(50px)' }}
              className="absolute left-5 top-[136px] flex gap-2"
            >
              {[
                { name: 'VALORANT', rank: 'Immortal', c: 'from-rose-500 to-red-700' },
                { name: 'LOL', rank: 'Diamond', c: 'from-sky-400 to-indigo-600' },
                { name: 'CS2', rank: 'LE', c: 'from-orange-400 to-amber-700' },
              ].map((g) => (
                <div
                  key={g.name}
                  className="relative h-20 w-16 overflow-hidden rounded-lg border border-white/10"
                >
                  <div className={`absolute inset-0 bg-gradient-to-br ${g.c}`} />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/85 to-transparent" />
                  <div className="absolute inset-x-0 bottom-1 px-1.5">
                    <div className="font-display truncate text-[11px] font-black text-white">
                      {g.name}
                    </div>
                    <div className="truncate font-mono-tight text-[7px] uppercase tracking-wider text-white/55">
                      {g.rank}
                    </div>
                  </div>
                </div>
              ))}
            </motion.div>

            {/* Discord card */}
            <motion.div
              {...floatAnim(3)}
              style={{ transform: 'translateZ(35px)' }}
              className="glass absolute right-5 top-[136px] flex w-[200px] items-center gap-2.5 rounded-xl border border-white/10 p-2.5"
            >
              <div className="h-9 w-9 flex-shrink-0 rounded-lg bg-gradient-to-br from-[var(--discord)] to-violet-500" />
              <div className="min-w-0 flex-1">
                <div className="truncate text-[11px] font-bold">persn.me HQ</div>
                <div className="flex items-center gap-1 truncate font-mono-tight text-[8px] text-white/45">
                  <span className="h-1 w-1 rounded-full bg-[var(--lime)]" />
                  4.2k online
                </div>
              </div>
            </motion.div>

            {/* Visitor counter */}
            <motion.div
              {...floatAnim(5)}
              style={{ transform: 'translateZ(20px)' }}
              className="absolute right-5 top-[212px] flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-1.5 backdrop-blur-md"
            >
              <Eye className="h-3 w-3 text-white/40" />
              <span className="font-mono-tight text-[10px] tabular-nums">12,847</span>
            </motion.div>

            {/* Music progress */}
            <motion.div
              {...floatAnim(4)}
              style={{ transform: 'translateZ(45px)' }}
              className="glass absolute inset-x-5 bottom-5 rounded-xl border border-white/10 p-3"
            >
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-md bg-[var(--discord)]">
                  <Music className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-mono-tight text-[8px] uppercase tracking-[0.2em] text-white/40">
                    Now playing
                  </div>
                  <div className="truncate text-[12px] font-bold">
                    Daft Punk — Digital Love
                  </div>
                </div>
                <div className="font-mono-tight text-[9px] tabular-nums text-white/45">
                  1:45 / 4:58
                </div>
              </div>
              <div className="mt-2 h-0.5 w-full overflow-hidden rounded-full bg-white/10">
                <motion.div
                  className="h-full rounded-full bg-gradient-to-r from-[var(--discord)] to-[var(--magenta)]"
                  initial={{ width: '20%' }}
                  animate={{ width: ['20%', '38%', '38%'] }}
                  transition={{ duration: 6, repeat: Infinity, ease: 'linear' }}
                />
              </div>
            </motion.div>

            {/* "Drop here" ghost */}
            <motion.div
              {...floatAnim(6)}
              style={{ transform: 'translateZ(15px)' }}
              className="absolute bottom-[100px] right-5 flex h-14 w-20 items-center justify-center rounded-lg border border-dashed border-white/20 font-mono-tight text-[8px] uppercase tracking-[0.22em] text-white/30"
            >
              Drop
            </motion.div>

            {/* Floating cursor showing the drag-and-drop promise */}
            <motion.div
              initial={{ x: 60, y: 250 }}
              animate={{ x: [60, 220, 60], y: [250, 100, 250] }}
              transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
              className="pointer-events-none absolute left-0 top-0 z-10 flex items-center gap-1.5"
              style={{ transform: 'translateZ(80px)' }}
            >
              <MousePointer2 className="h-4 w-4 fill-white text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.6)]" />
              <span className="rounded-full bg-[var(--discord)] px-2 py-0.5 font-mono-tight text-[9px] uppercase tracking-wider">
                you
              </span>
            </motion.div>
          </div>
        </div>

        {/* Glow */}
        <div className="pointer-events-none absolute -inset-10 -z-10 bg-[radial-gradient(circle_at_center,rgba(88,101,242,0.18),transparent_60%)]" />
      </motion.div>

      {/* Floating bottom badge */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.2, duration: 0.6 }}
        className="absolute -bottom-5 left-1/2 z-20 -translate-x-1/2 whitespace-nowrap rounded-full border border-white/10 bg-black/80 px-4 py-2 font-mono-tight text-[10px] uppercase tracking-[0.22em] backdrop-blur-md"
      >
        <span className="text-white/40">try it →</span>{' '}
        <span className="text-[var(--lime)]">click anywhere</span>
      </motion.div>
    </div>
  );
}

function LiveClock() {
  const [time, setTime] = useState(() => formatTime(new Date()));
  useEffect(() => {
    const id = setInterval(() => setTime(formatTime(new Date())), 1000);
    return () => clearInterval(id);
  }, []);
  return <span>{time}</span>;
}
function formatTime(d) {
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function floatAnim(i) {
  return {
    initial: { opacity: 0, y: 10 },
    animate: { opacity: 1, y: 0 },
    transition: {
      delay: 0.45 + i * 0.1,
      duration: 0.6,
      ease: [0.22, 1, 0.36, 1],
    },
  };
}

/* ============================================================ */
/* STATS                                                         */
/* ============================================================ */

function Stats() {
  const stats = [
    { n: '12,438', label: 'Profiles shipped', accent: 'var(--discord)' },
    { n: '1.4M', label: 'Clicks this week', accent: 'var(--lime)' },
    { n: '38s', label: 'Median build time', accent: 'var(--magenta)' },
    { n: '24', label: 'Widgets available', accent: 'var(--discord)' },
  ];
  return (
    <section className="relative border-y border-white/[0.06] bg-black/40">
      <div className="mx-auto grid max-w-[1440px] grid-cols-2 divide-x divide-white/[0.06] md:grid-cols-4">
        {stats.map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.05, duration: 0.5 }}
            className="group relative overflow-hidden px-6 py-7 transition-colors hover:bg-white/[0.015]"
          >
            <span
              className="pointer-events-none absolute inset-x-0 -bottom-px h-[2px] origin-left scale-x-0 transition-transform duration-500 group-hover:scale-x-100"
              style={{ backgroundColor: s.accent }}
            />
            <div className="font-display text-5xl font-black leading-none tracking-tight md:text-6xl">
              {s.n}
            </div>
            <div className="mt-2 font-mono-tight text-[10px] uppercase tracking-[0.22em] text-white/45">
              {s.label}
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

/* ============================================================ */
/* MARQUEE                                                       */
/* ============================================================ */

function Marquee() {
  const items = [
    'Freeform canvas',
    'Drag & drop',
    'Music sync',
    'Discord Nitro',
    'Vanity URLs',
    'Clip previews',
    'Custom cursor',
    'Backdrop blur',
    'Snap guides',
    'Glow text',
    'Glitch effects',
    'Gradient ramps',
    'Visitor stats',
    'Weather widget',
  ];
  return (
    <section className="relative border-b border-white/[0.06] py-5">
      <div className="flex overflow-hidden whitespace-nowrap [mask-image:linear-gradient(to_right,transparent,black_8%,black_92%,transparent)]">
        <div className="flex animate-[marquee_60s_linear_infinite] items-center gap-12 pr-12">
          {[...items, ...items, ...items].map((it, i) => (
            <span
              key={i}
              className="flex items-center gap-3 font-display text-2xl font-black uppercase tracking-tight text-white/15 transition-colors hover:text-white"
            >
              {it}
              <span className="inline-block h-1.5 w-1.5 rotate-45 bg-[var(--discord)]" />
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ============================================================ */
/* CANVAS SHOWCASE — interactive demo of what the editor does    */
/* ============================================================ */

const CANVAS_TABS = [
  {
    id: 'drag',
    icon: Move,
    label: 'Drag anywhere',
    title: 'PIXEL-CLEAN PLACEMENT',
    desc: 'No grids holding you back. Drag widgets onto the canvas, snap to guides, lock to centers. Pixel-clean alignment without thinking about it.',
  },
  {
    id: 'music',
    icon: Music,
    label: 'Music sync',
    title: 'YOUR EARS, YOUR BIO',
    desc: 'Paste a YouTube, Spotify, or .mp3 link. The progress bar, now-playing card, and avatar pulse-ring all sync to one source.',
  },
  {
    id: 'effects',
    icon: Palette,
    label: 'Text effects',
    title: 'TYPOGRAPHIC ARSENAL',
    desc: 'Glow, gradient, glitch, outline, shadow — stack them on any text widget. Per-character control if you want to go feral.',
  },
  {
    id: 'url',
    icon: LinkIcon,
    label: 'Vanity URL',
    title: 'CLAIM YOUR HANDLE',
    desc: 'Pick persn.me/yourname. Locked to your account, locked for 7 days after a rename — no squatting, no duplicates.',
  },
];

function CanvasShowcase() {
  const [tab, setTab] = useState('drag');
  const active = CANVAS_TABS.find((t) => t.id === tab);

  return (
    <section className="relative border-b border-white/[0.06] py-32 px-6">
      <div className="mx-auto max-w-[1440px]">
        <header className="mb-14 flex flex-col items-start gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="mb-4 flex items-center gap-2 font-mono-tight text-[10px] uppercase tracking-[0.24em] text-white/45">
              <span className="h-1 w-6 bg-[var(--lime)]" />
              See it move / Live demo
            </div>
            <h2 className="font-display max-w-3xl text-[10vw] font-black leading-[0.9] tracking-[-0.02em] lg:text-[6rem]">
              NOT A SCREENSHOT.
              <br />
              <span className="text-white/30">A REAL DEMO.</span>
            </h2>
          </div>
          <p className="font-body max-w-sm text-[15px] leading-relaxed text-white/55">
            Click a tab. Watch the canvas react. Each one of these is a
            two-click operation in the actual editor.
          </p>
        </header>

        <div className="grid gap-8 lg:grid-cols-12">
          {/* Tabs */}
          <div className="lg:col-span-4">
            <div className="flex flex-col gap-2">
              {CANVAS_TABS.map((t, i) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTab(t.id)}
                  className={[
                    'group relative overflow-hidden rounded-xl border px-5 py-4 text-left transition-all duration-300',
                    tab === t.id
                      ? 'border-white/15 bg-white/[0.05]'
                      : 'border-white/[0.06] bg-transparent hover:border-white/10 hover:bg-white/[0.02]',
                  ].join(' ')}
                >
                  {tab === t.id && (
                    <motion.span
                      layoutId="canvas-tab"
                      className="absolute inset-y-0 left-0 w-[3px] bg-gradient-to-b from-[var(--discord)] to-[var(--magenta)]"
                    />
                  )}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <t.icon
                        className={[
                          'h-4 w-4 transition-colors',
                          tab === t.id ? 'text-[var(--lime)]' : 'text-white/40',
                        ].join(' ')}
                      />
                      <div>
                        <div className="font-mono-tight text-[9px] uppercase tracking-[0.22em] text-white/35">
                          {String(i + 1).padStart(2, '0')}
                        </div>
                        <div className="font-display text-2xl font-black leading-none tracking-tight">
                          {t.label}
                        </div>
                      </div>
                    </div>
                    <ChevronRight
                      className={[
                        'h-4 w-4 transition-transform',
                        tab === t.id
                          ? 'translate-x-0.5 text-white'
                          : 'text-white/20',
                      ].join(' ')}
                    />
                  </div>
                </button>
              ))}
            </div>
            <AnimatePresence mode="wait">
              <motion.div
                key={tab}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.4 }}
                className="mt-8"
              >
                <div className="font-display text-3xl font-black leading-tight tracking-tight">
                  {active.title}
                </div>
                <p className="font-body mt-3 text-[14px] leading-relaxed text-white/55">
                  {active.desc}
                </p>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Demo canvas */}
          <div className="relative lg:col-span-8">
            <DemoCanvas tab={tab} />
          </div>
        </div>
      </div>
    </section>
  );
}

function DemoCanvas({ tab }) {
  return (
    <div className="relative aspect-[16/10] w-full overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-[#0a0a0a] to-[#040404] shadow-[0_30px_70px_rgba(0,0,0,0.45)]">
      {/* Toolbar */}
      <div className="flex items-center justify-between border-b border-white/[0.06] bg-black/40 px-4 py-2">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-[var(--lime)] shadow-[0_0_8px_var(--lime)]" />
          <span className="font-mono-tight text-[9px] uppercase tracking-[0.22em] text-white/45">
            editor.persn.me / canvas
          </span>
        </div>
        <div className="flex items-center gap-2 font-mono-tight text-[9px] uppercase tracking-[0.22em] text-white/30">
          <Plus className="h-3 w-3" />
          Widget
          <span className="mx-1 h-3 w-px bg-white/10" />
          <Hand className="h-3 w-3" />
          Pan
          <span className="mx-1 h-3 w-px bg-white/10" />
          <Pause className="h-3 w-3" />
          Pause
        </div>
      </div>

      <div className="relative h-[calc(100%-30px)]">
        {/* Atmosphere */}
        <div
          className="absolute inset-0"
          style={{
            background:
              'radial-gradient(circle at 30% 20%, rgba(88,101,242,0.25), transparent 50%), radial-gradient(circle at 80% 90%, rgba(255,46,136,0.15), transparent 45%)',
          }}
        />
        <div
          className="absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage:
              'repeating-linear-gradient(0deg, white 0 1px, transparent 1px 32px), repeating-linear-gradient(90deg, white 0 1px, transparent 1px 32px)',
          }}
        />
        <div className="scan-bar" />

        <AnimatePresence mode="wait">
          {tab === 'drag' && <DragDemo key="drag" />}
          {tab === 'music' && <MusicDemo key="music" />}
          {tab === 'effects' && <EffectsDemo key="effects" />}
          {tab === 'url' && <UrlDemo key="url" />}
        </AnimatePresence>
      </div>
    </div>
  );
}

function DragDemo() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
      className="absolute inset-0"
    >
      {/* Dropzones (snap guides) */}
      <div className="absolute inset-8 rounded-xl border border-dashed border-white/10" />
      <div className="absolute left-1/2 top-8 bottom-8 w-px bg-white/[0.06]" />
      <div className="absolute top-1/2 left-8 right-8 h-px bg-white/[0.06]" />

      {/* Static widgets */}
      <div className="absolute left-12 top-12 flex items-center gap-2.5 rounded-xl border border-white/10 bg-white/[0.04] p-2.5 backdrop-blur-md">
        <div className="h-9 w-9 rounded-full bg-gradient-to-br from-[var(--discord)] to-[var(--magenta)]" />
        <div>
          <div className="text-[12px] font-bold">@akari_x</div>
          <div className="font-mono-tight text-[8px] uppercase tracking-[0.18em] text-white/40">
            Tokyo
          </div>
        </div>
      </div>

      <div className="absolute right-14 top-14 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 backdrop-blur-md">
        <div className="font-mono-tight text-[8px] uppercase tracking-[0.18em] text-white/40">
          Local
        </div>
        <div className="font-mono-tight text-base font-bold tabular-nums">
          <LiveClock />
        </div>
      </div>

      <div className="absolute left-14 bottom-14 flex gap-2">
        {['VAL', 'LOL', 'CS2'].map((g, i) => (
          <div
            key={g}
            className={`flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-to-br ${
              ['from-rose-500 to-red-700', 'from-sky-400 to-indigo-600', 'from-orange-400 to-amber-700'][i]
            } font-display text-xs font-black`}
          >
            {g}
          </div>
        ))}
      </div>

      {/* The dragging widget */}
      <motion.div
        initial={{ x: 320, y: 200 }}
        animate={{
          x: [320, 200, 200, 360, 320],
          y: [200, 80, 80, 160, 200],
        }}
        transition={{
          duration: 6,
          repeat: Infinity,
          ease: 'easeInOut',
          times: [0, 0.25, 0.5, 0.75, 1],
        }}
        className="absolute left-0 top-0"
      >
        <div className="relative">
          <motion.div
            animate={{ scale: [1, 1.05, 1, 1.05, 1] }}
            transition={{ duration: 6, repeat: Infinity, times: [0, 0.25, 0.5, 0.75, 1] }}
            className="rounded-xl border border-[var(--lime)]/60 bg-white/[0.06] p-2.5 shadow-[0_10px_30px_rgba(0,0,0,0.4)] backdrop-blur-md"
          >
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-md bg-[var(--lime)]/15 text-[var(--lime)]">
                <Music className="h-3.5 w-3.5" />
              </div>
              <div>
                <div className="text-[11px] font-bold">Now playing</div>
                <div className="font-mono-tight text-[8px] uppercase tracking-[0.18em] text-white/45">
                  Daft Punk
                </div>
              </div>
            </div>
          </motion.div>
          <span className="absolute -bottom-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-[var(--lime)] px-1.5 py-0.5 font-mono-tight text-[8px] font-bold uppercase tracking-wider text-black">
            DRAG
          </span>
          <MousePointer2
            className="absolute -right-3 -top-2 h-4 w-4 fill-white text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.6)]"
          />
        </div>
      </motion.div>

      {/* Snap line */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 1, 0, 1, 0] }}
        transition={{ duration: 6, repeat: Infinity, times: [0, 0.25, 0.4, 0.75, 1] }}
        className="absolute left-1/2 top-8 bottom-8 w-px"
        style={{ background: 'var(--lime)', boxShadow: '0 0 8px var(--lime)' }}
      />

      {/* Bottom HUD */}
      <div className="absolute inset-x-4 bottom-3 flex items-center justify-between font-mono-tight text-[9px] uppercase tracking-[0.22em] text-white/35">
        <span>x: 412 · y: 198 · snap: center</span>
        <span className="flex items-center gap-1">
          <span className="h-1.5 w-1.5 rounded-full bg-[var(--lime)]" /> aligned
        </span>
      </div>
    </motion.div>
  );
}

function MusicDemo() {
  const [progress, setProgress] = useState(20);
  useEffect(() => {
    const id = setInterval(() => {
      setProgress((p) => (p >= 95 ? 20 : p + 0.6));
    }, 80);
    return () => clearInterval(id);
  }, []);
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
      className="absolute inset-0 flex items-center justify-center"
    >
      <div className="flex w-full max-w-[460px] flex-col gap-6 px-6">
        {/* Avatar with pulse ring synced */}
        <div className="flex items-center gap-5">
          <div className="relative">
            <motion.div
              animate={{ scale: [1, 1.15, 1], opacity: [0.6, 0, 0.6] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeOut' }}
              className="absolute inset-0 -m-2 rounded-full border border-[var(--magenta)]/60"
            />
            <motion.div
              animate={{ scale: [1, 1.25, 1], opacity: [0.4, 0, 0.4] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeOut', delay: 0.5 }}
              className="absolute inset-0 -m-4 rounded-full border border-[var(--magenta)]/40"
            />
            <div className="relative h-16 w-16 overflow-hidden rounded-full bg-gradient-to-br from-[var(--magenta)] via-violet-400 to-[var(--discord)]" />
          </div>
          <div>
            <div className="font-display text-2xl font-black tracking-tight">AKARI_X</div>
            <div className="font-mono-tight text-[10px] uppercase tracking-[0.22em] text-white/45">
              ↑ pulse syncs to track ↓
            </div>
          </div>
        </div>

        {/* Music card */}
        <div className="rounded-xl border border-white/10 bg-white/[0.04] p-4 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-md bg-gradient-to-br from-[var(--discord)] to-[var(--magenta)]">
              <Music className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="font-mono-tight text-[9px] uppercase tracking-[0.22em] text-white/40">
                Now playing — YouTube
              </div>
              <div className="text-sm font-bold">Digital Love</div>
              <div className="text-[11px] text-white/55">Daft Punk · Discovery</div>
            </div>
          </div>
          <div className="mt-3 flex items-center gap-2 font-mono-tight text-[9px] tabular-nums text-white/45">
            <span>{formatProgress(progress, 298)}</span>
            <div className="relative h-1 flex-1 overflow-hidden rounded-full bg-white/10">
              <div
                className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-[var(--discord)] to-[var(--magenta)]"
                style={{ width: `${progress}%` }}
              />
            </div>
            <span>4:58</span>
          </div>
        </div>

        {/* Source picker mock */}
        <div className="flex items-center gap-2 font-mono-tight text-[9px] uppercase tracking-[0.22em] text-white/45">
          <span className="rounded-md border border-[var(--lime)]/40 bg-[var(--lime)]/10 px-2 py-1 text-[var(--lime)]">
            YouTube
          </span>
          <span className="rounded-md border border-white/10 bg-white/[0.04] px-2 py-1">
            Spotify
          </span>
          <span className="rounded-md border border-white/10 bg-white/[0.04] px-2 py-1">
            SoundCloud
          </span>
          <span className="rounded-md border border-white/10 bg-white/[0.04] px-2 py-1">
            mp3
          </span>
        </div>
      </div>
    </motion.div>
  );
}

function formatProgress(percent, totalSec) {
  const sec = Math.round((percent / 100) * totalSec);
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function EffectsDemo() {
  const samples = [
    { label: 'glow', cls: 'text-white', style: { textShadow: '0 0 24px rgba(88,101,242,0.9), 0 0 8px rgba(88,101,242,0.7)' } },
    { label: 'gradient', cls: 'bg-gradient-to-r from-[var(--lime)] via-[var(--discord)] to-[var(--magenta)] bg-clip-text text-transparent' },
    { label: 'outline', cls: 'text-transparent', style: { WebkitTextStroke: '1.5px white' } },
    { label: 'glitch', cls: 'text-white relative inline-block', glitch: true },
  ];
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
      className="absolute inset-0 flex items-center justify-center px-8"
    >
      <div className="grid w-full max-w-[600px] grid-cols-2 gap-4">
        {samples.map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08, duration: 0.4 }}
            className="rounded-xl border border-white/10 bg-white/[0.025] p-5 backdrop-blur-md"
          >
            <div className="font-mono-tight text-[9px] uppercase tracking-[0.22em] text-white/40">
              FX {String(i + 1).padStart(2, '0')} · {s.label}
            </div>
            <div className="mt-2 font-display text-5xl font-black leading-none">
              {s.glitch ? <Glitch text="SLAPS" /> : (
                <span className={s.cls} style={s.style}>SLAPS</span>
              )}
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}

function Glitch({ text }) {
  return (
    <span className="relative inline-block">
      <span className="text-white">{text}</span>
      <motion.span
        aria-hidden
        className="absolute inset-0 text-[var(--magenta)] mix-blend-screen"
        animate={{ x: [0, -2, 1, 0, 2, 0], opacity: [1, 0.7, 1, 0.6, 1] }}
        transition={{ duration: 2, repeat: Infinity }}
      >
        {text}
      </motion.span>
      <motion.span
        aria-hidden
        className="absolute inset-0 text-[var(--lime)] mix-blend-screen"
        animate={{ x: [0, 2, -1, 0, -2, 0], opacity: [1, 0.6, 1, 0.7, 1] }}
        transition={{ duration: 2, repeat: Infinity }}
      >
        {text}
      </motion.span>
    </span>
  );
}

function UrlDemo() {
  const candidates = ['akari_x', 'lost-in-tokyo', 'gigachad99', 'mochi.dev'];
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setIdx((i) => (i + 1) % candidates.length), 2200);
    return () => clearInterval(id);
  }, []);
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
      className="absolute inset-0 flex items-center justify-center px-8"
    >
      <div className="w-full max-w-[520px]">
        <div className="font-mono-tight text-[10px] uppercase tracking-[0.22em] text-white/40">
          Step 02 / Pick your handle
        </div>
        <div className="mt-3 flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.04] px-5 py-4 backdrop-blur-md">
          <span className="font-display text-3xl font-black text-white/40">persn.me/</span>
          <div className="font-display flex-1 text-3xl font-black tracking-tight text-white">
            <AnimatePresence mode="wait">
              <motion.span
                key={candidates[idx]}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.3 }}
                className="inline-block"
              >
                {candidates[idx]}
              </motion.span>
            </AnimatePresence>
            <span className="ml-1 inline-block h-7 w-[2px] animate-[blink_1s_step-end_infinite] bg-[var(--lime)] align-middle" />
          </div>
          <button
            type="button"
            className="flex h-10 items-center gap-1.5 rounded-md bg-[var(--lime)] px-4 font-mono-tight text-[10px] font-bold uppercase tracking-[0.2em] text-black"
          >
            <Lock className="h-3 w-3" />
            Claim
          </button>
        </div>
        <div className="mt-3 flex items-center gap-2 font-mono-tight text-[10px] uppercase tracking-[0.22em]">
          <span className="flex items-center gap-1.5 text-[var(--lime)]">
            <Check className="h-3 w-3" />
            Available
          </span>
          <span className="text-white/30">·</span>
          <span className="text-white/40">Locked for 7 days after claim</span>
        </div>
      </div>
    </motion.div>
  );
}

/* ============================================================ */
/* PROFILE WALL — auto-scrolling carousel of real fetched data   */
/* ============================================================ */

const WIDGET_META = {
  badges: { icon: Award, label: 'Badges', tint: '#ffb347' },
  socials: { icon: Share2, label: 'Socials', tint: '#5865F2' },
  discordServers: { icon: Server, label: 'Discord', tint: '#5865F2' },
  discordPresence: { icon: Server, label: 'Status', tint: '#5865F2' },
  games: { icon: Gamepad2, label: 'Games', tint: '#ff2e88' },
  clock: { icon: Clock, label: 'Clock', tint: '#c0ff3e' },
  weather: { icon: Cloud, label: 'Weather', tint: '#7dd3fc' },
  nowPlaying: { icon: Music, label: 'Music', tint: '#ff2e88' },
  musicProgress: { icon: Activity, label: 'Player', tint: '#ff2e88' },
  visitorCounter: { icon: Eye, label: 'Stats', tint: '#c0ff3e' },
  twitchStream: { icon: Tv, label: 'Twitch', tint: '#a855f7' },
  guestbook: { icon: MessageSquare, label: 'Guestbook', tint: '#ffb347' },
  qa: { icon: HelpCircle, label: 'Q&A', tint: '#7dd3fc' },
  clickerGame: { icon: MousePointer2, label: 'Clicker', tint: '#c0ff3e' },
};

function topWidgets(widgets, max = 3) {
  if (!Array.isArray(widgets)) return [];
  return Array.from(new Set(widgets))
    .filter((t) => t !== 'avatar' && t !== 'group' && WIDGET_META[t])
    .slice(0, max);
}

function ProfileWall() {
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await getExploreFeed({ page: 1, limit: 20, sort: 'clicker' });
      if (cancelled) return;
      const filled = (res.entries || []).filter((p) => p?.slug);
      setProfiles(filled);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Build the moving track. We need the visible width filled even with few
  // profiles — so we pad up to `MIN_TRACK_LEN` cards by repeating, then x2 for
  // the seamless loop.
  const MIN_TRACK_LEN = 8;
  const seq = useMemo(() => {
    if (profiles.length === 0) return [];
    const reps = Math.max(2, Math.ceil(MIN_TRACK_LEN / profiles.length));
    const padded = [];
    for (let i = 0; i < reps; i++) padded.push(...profiles);
    return [...padded, ...padded]; // double for loop
  }, [profiles]);

  // Animation duration scales with raw profile count: ~8s per unique card,
  // bounded so it doesn't crawl on huge feeds or sprint on tiny ones.
  const duration = Math.min(120, Math.max(30, profiles.length * 8));

  return (
    <section className="relative border-b border-white/[0.06] py-32">
      <div className="mx-auto mb-14 max-w-[1440px] px-6">
        <header className="flex flex-col items-start gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="mb-4 flex items-center gap-2 font-mono-tight text-[10px] uppercase tracking-[0.24em] text-white/45">
              <span className="h-1 w-6 bg-[var(--magenta)]" />
              The wall / community ·{' '}
              <span className="text-white/65">{profiles.length} live</span>
            </div>
            <h2 className="font-display max-w-3xl text-[10vw] font-black leading-[0.9] tracking-[-0.02em] lg:text-[6rem]">
              REAL PROFILES.
              <br />
              <span style={{ fontFamily: 'Playfair Display' }} className="italic font-medium text-white/50">
                no
              </span>{' '}
              <span className="text-[var(--magenta)]">TEMPLATES.</span>
            </h2>
          </div>
          <Link
            to="/explore"
            className="group flex items-center gap-2 rounded-md border border-white/10 bg-white/[0.03] px-5 py-3 font-mono-tight text-[11px] font-bold uppercase tracking-[0.2em] text-white/85 backdrop-blur-md transition hover:border-white/25 hover:bg-white/[0.06]"
          >
            Explore the wall
            <ArrowUpRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </Link>
        </header>
      </div>

      {/* Carousel — full bleed for cinematic edge */}
      <div className="group relative">
        {/* Side fades */}
        <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-32 bg-gradient-to-r from-[#050505] to-transparent" />
        <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-32 bg-gradient-to-l from-[#050505] to-transparent" />

        {loading && profiles.length === 0 && (
          <div className="flex gap-5 px-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="h-[380px] w-[280px] flex-shrink-0 animate-pulse rounded-2xl border border-white/[0.06] bg-white/[0.015]"
              />
            ))}
          </div>
        )}

        {!loading && profiles.length === 0 && (
          <div className="mx-auto max-w-md rounded-2xl border border-dashed border-white/[0.08] bg-white/[0.01] p-10 text-center">
            <p className="font-mono-tight text-[10px] uppercase tracking-[0.24em] text-white/30">
              no profiles yet — be the first
            </p>
          </div>
        )}

        {profiles.length > 0 && (
          <div className="overflow-hidden">
            <div
              className="flex w-max gap-5 px-6"
              style={{
                animation: `marquee ${duration}s linear infinite`,
                animationPlayState: 'running',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.animationPlayState = 'paused')}
              onMouseLeave={(e) => (e.currentTarget.style.animationPlayState = 'running')}
            >
              {seq.map((p, i) => (
                <CarouselCard
                  key={`${p.slug}-${i}`}
                  profile={p}
                  index={(i % profiles.length) + 1}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

function CarouselCard({ profile, index }) {
  const accent = profile.accent || '#5865F2';
  const widgets = topWidgets(profile.widgets, 3);
  const extra = Math.max(
    0,
    Array.from(new Set(profile.widgets || []))
      .filter((t) => t !== 'avatar' && t !== 'group').length - widgets.length,
  );

  return (
    <Link
      to={`/${profile.slug}`}
      className="group/card relative block h-[380px] w-[280px] flex-shrink-0 overflow-hidden rounded-2xl border border-white/[0.07] bg-[#0a0a0a] transition-all duration-500 hover:-translate-y-1 hover:border-white/20"
    >
      {/* Avatar full-bleed background */}
      <div className="absolute inset-0">
        {profile.avatarUrl && /^https?:/.test(profile.avatarUrl) ? (
          <img
            src={profile.avatarUrl}
            alt=""
            className="h-full w-full scale-110 object-cover opacity-60 blur-md transition-all duration-700 group-hover/card:scale-100 group-hover/card:opacity-90 group-hover/card:blur-0"
            loading="lazy"
          />
        ) : (
          <div
            className="h-full w-full"
            style={{ background: `radial-gradient(circle at 30% 20%, ${accent}50, transparent 60%), linear-gradient(135deg, ${accent}30, #0a0a0a)` }}
          />
        )}
      </div>
      {/* Scrims */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/55 to-black/20" />
      <div
        className="absolute inset-0"
        style={{ background: `linear-gradient(180deg, transparent 40%, ${accent}10 100%)` }}
      />
      <div
        className="absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage:
            'repeating-linear-gradient(0deg, white 0 1px, transparent 1px 22px), repeating-linear-gradient(90deg, white 0 1px, transparent 1px 22px)',
        }}
      />

      {/* Top bar */}
      <div className="absolute inset-x-3 top-3 flex items-center justify-between">
        <div className="flex h-6 items-center gap-1.5 rounded-full bg-black/60 px-2 font-mono-tight text-[8px] uppercase tracking-[0.22em] backdrop-blur">
          <span className="h-1 w-1 rounded-full bg-[var(--lime)] shadow-[0_0_6px_var(--lime)]" />
          live
        </div>
        <div className="font-mono-tight text-[8px] uppercase tracking-[0.24em] text-white/45">
          #{String(index).padStart(3, '0')}
        </div>
      </div>

      {/* Crisp avatar circle */}
      <div className="absolute left-1/2 top-[58px] -translate-x-1/2">
        <div className="relative">
          <div
            className="absolute inset-0 -m-1.5 rounded-full opacity-50 blur-md"
            style={{ backgroundColor: accent }}
          />
          {profile.avatarUrl && /^https?:/.test(profile.avatarUrl) ? (
            <img
              src={profile.avatarUrl}
              alt={profile.username}
              className="relative h-20 w-20 rounded-full object-cover ring-2 ring-white/15"
              loading="lazy"
            />
          ) : (
            <div
              className="relative flex h-20 w-20 items-center justify-center rounded-full text-3xl font-black ring-2 ring-white/15"
              style={{
                background: `linear-gradient(135deg, ${accent}, #1a1a1a)`,
                fontFamily: 'Bebas Neue',
              }}
            >
              {(profile.username || '?').charAt(0).toUpperCase()}
            </div>
          )}
        </div>
      </div>

      {/* Bottom block */}
      <div className="absolute inset-x-0 bottom-0 p-4">
        <div className="font-display truncate text-3xl font-black leading-none tracking-tight">
          @{profile.username}
        </div>
        <div className="mt-1 truncate font-mono-tight text-[8.5px] uppercase tracking-[0.22em] text-white/50">
          persn.me/{profile.slug}
        </div>

        {/* Widget pills */}
        {widgets.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1">
            {widgets.map((type) => {
              const m = WIDGET_META[type];
              const Icon = m.icon;
              return (
                <span
                  key={type}
                  className="inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 font-mono-tight text-[8px] uppercase tracking-[0.18em]"
                  style={{
                    color: m.tint,
                    borderColor: `${m.tint}40`,
                    backgroundColor: `${m.tint}12`,
                  }}
                >
                  <Icon className="h-2.5 w-2.5" />
                  {m.label}
                </span>
              );
            })}
            {extra > 0 && (
              <span className="inline-flex items-center rounded-full border border-white/15 bg-white/[0.05] px-1.5 py-0.5 font-mono-tight text-[8px] uppercase tracking-[0.18em] text-white/55">
                +{extra}
              </span>
            )}
          </div>
        )}

        <div className="mt-3 flex items-center justify-between border-t border-white/[0.08] pt-3">
          <div className="flex items-center gap-1.5 font-mono-tight text-[9px] uppercase tracking-[0.22em] text-white/45">
            {profile.clickerScore > 0 ? (
              <>
                <MousePointer2 className="h-3 w-3" />
                <span className="tabular-nums">
                  {profile.clickerScore.toLocaleString()} clicks
                </span>
              </>
            ) : (
              <span>new profile</span>
            )}
          </div>
          <ArrowUpRight className="h-4 w-4 text-white/45 transition-all group-hover/card:translate-x-0.5 group-hover/card:-translate-y-0.5 group-hover/card:text-white" />
        </div>
      </div>

      {/* Bottom accent strip */}
      <div
        className="absolute inset-x-0 bottom-0 h-[3px] origin-left scale-x-0 transition-transform duration-500 group-hover/card:scale-x-100"
        style={{ background: accent }}
      />
    </Link>
  );
}

/* ============================================================ */
/* FEATURES — 3D perspective grid                                */
/* ============================================================ */

function Features() {
  const features = [
    {
      n: '01',
      icon: Layers,
      title: 'FREEFORM CANVAS',
      desc: 'No grid. No template farm. Pixel-clean snap guides do the alignment for you while you make the actual choices.',
      tag: 'Core',
    },
    {
      n: '02',
      icon: Music,
      title: 'MUSIC SYNC',
      desc: 'YouTube · Spotify · SoundCloud · raw mp3. Progress bar, now-playing card, and avatar pulse all on one source.',
      tag: 'Live',
    },
    {
      n: '03',
      icon: Globe,
      title: 'VANITY URLS',
      desc: 'persn.me/yourname is yours. Locked to your account. 7-day rename cooldown to kill squatting.',
      tag: 'Identity',
    },
    {
      n: '04',
      icon: Gamepad2,
      title: 'GAMER FIRST',
      desc: 'Rank cards, hover-clip previews, Discord server widgets, Nitro badges — built around how flexing actually looks.',
      tag: 'Native',
    },
    {
      n: '05',
      icon: Sparkles,
      title: 'EFFECTS LAYER',
      desc: 'Custom cursors. Per-widget backdrop blur. Glow, gradient, glitch, outline on any text. Stack them.',
      tag: 'Polish',
    },
    {
      n: '06',
      icon: Lock,
      title: 'YOUR DATA',
      desc: 'Profiles live on your account — or encoded directly in a URL if you want zero-signup. No tracking, no ads.',
      tag: 'Privacy',
    },
  ];
  return (
    <section id="features" className="relative border-b border-white/[0.06] py-32 px-6">
      <div className="mx-auto max-w-[1440px]">
        <header className="mb-16 flex flex-col items-start gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="mb-4 flex items-center gap-2 font-mono-tight text-[10px] uppercase tracking-[0.24em] text-white/45">
              <span className="h-1 w-6 bg-[var(--discord)]" />
              Features / 06 levers
            </div>
            <h2 className="font-display max-w-3xl text-[10vw] font-black leading-[0.9] tracking-[-0.02em] lg:text-[6rem]">
              EVERY KNOB.
              <br />
              <span className="text-white/30">NONE OF THE BLOAT.</span>
            </h2>
          </div>
          <p className="font-body max-w-sm text-[15px] leading-relaxed text-white/55">
            We built this for people who actually care how their profile looks.
            Not another Linktree fork. Not a template marketplace.
          </p>
        </header>

        <div className="grid gap-px overflow-hidden rounded-2xl border border-white/[0.07] bg-white/[0.04] md:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <FeatureCard key={f.n} {...f} />
          ))}
        </div>
      </div>
    </section>
  );
}

function FeatureCard({ n, icon: Icon, title, desc, tag }) {
  const ref = useRef(null);
  const rx = useMotionValue(0);
  const ry = useMotionValue(0);
  const onMove = (e) => {
    const r = ref.current?.getBoundingClientRect();
    if (!r) return;
    const x = (e.clientX - r.left) / r.width - 0.5;
    const y = (e.clientY - r.top) / r.height - 0.5;
    rx.set(-y * 4);
    ry.set(x * 5);
  };
  const onLeave = () => {
    rx.set(0);
    ry.set(0);
  };
  return (
    <motion.div
      ref={ref}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      initial={{ opacity: 0, y: 14 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      style={{ rotateX: rx, rotateY: ry, transformStyle: 'preserve-3d', perspective: 1200 }}
      className="group relative flex min-h-[280px] flex-col gap-6 overflow-hidden bg-[#0a0a0a] p-8 transition-colors hover:bg-[#0d0d0d]"
    >
      <span
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100"
        style={{
          background:
            'radial-gradient(circle at 50% 0%, rgba(88,101,242,0.18), transparent 60%)',
        }}
      />
      <div className="relative flex items-start justify-between" style={{ transform: 'translateZ(20px)' }}>
        <span className="font-mono-tight text-[10px] uppercase tracking-[0.24em] text-white/30">
          {n} / {tag}
        </span>
        <div className="flex h-10 w-10 items-center justify-center rounded-md border border-white/10 bg-white/[0.02] text-white/55 transition-all group-hover:border-[var(--discord)]/40 group-hover:bg-[var(--discord)]/10 group-hover:text-[var(--discord)]">
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <h3
        className="font-display text-4xl font-black leading-none tracking-tight"
        style={{ transform: 'translateZ(40px)' }}
      >
        {title}
      </h3>
      <p
        className="font-body text-[14px] leading-relaxed text-white/55"
        style={{ transform: 'translateZ(15px)' }}
      >
        {desc}
      </p>
      <ArrowUpRight
        className="absolute bottom-6 right-6 h-4 w-4 text-white/15 transition-all group-hover:text-[var(--lime)]"
        style={{ transform: 'translateZ(30px)' }}
      />
    </motion.div>
  );
}

/* ============================================================ */
/* HOW IT WORKS                                                  */
/* ============================================================ */

function HowItWorks() {
  const steps = [
    {
      n: '01',
      title: 'OPEN THE EDITOR',
      desc: 'Start blank or fork a community profile. No account needed to experiment — your work lives in the URL until you save.',
      icon: Layers,
    },
    {
      n: '02',
      title: 'DRAG · TWEAK · PLAY',
      desc: 'Move widgets around the canvas. Tune transparency, blur, text effects. Preview in one tab while you edit in another.',
      icon: Move,
    },
    {
      n: '03',
      title: 'CLAIM & SHIP',
      desc: 'Sign in with Discord, pick your URL, hit claim. You get persn.me/yourname locked to your account, ready to flex.',
      icon: Lock,
    },
  ];
  return (
    <section id="how" className="relative border-b border-white/[0.06] py-32 px-6">
      <div className="mx-auto max-w-[1440px]">
        <header className="mb-16 max-w-2xl">
          <div className="mb-4 flex items-center gap-2 font-mono-tight text-[10px] uppercase tracking-[0.24em] text-white/45">
            <span className="h-1 w-6 bg-[var(--lime)]" />
            Workflow / 3 steps
          </div>
          <h2 className="font-display text-[10vw] font-black leading-[0.9] tracking-[-0.02em] lg:text-[6rem]">
            THIRTY SECONDS.
            <br />
            <span className="text-white/30">THAT'S IT.</span>
          </h2>
        </header>

        <ol className="relative grid gap-6 md:grid-cols-3">
          {/* connector line */}
          <div className="absolute left-7 right-7 top-[120px] hidden h-px bg-gradient-to-r from-[var(--discord)] via-[var(--magenta)] to-[var(--lime)] md:block" />
          {steps.map((s, i) => (
            <motion.li
              key={s.n}
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.55, delay: i * 0.1 }}
              className="relative flex flex-col gap-5 overflow-hidden rounded-2xl border border-white/[0.07] bg-white/[0.025] p-7 backdrop-blur"
            >
              <div className="flex items-center justify-between">
                <span className="font-display text-7xl font-black leading-none text-white/15">
                  {s.n}
                </span>
                <div className="flex h-12 w-12 items-center justify-center rounded-full border border-[var(--discord)]/40 bg-[var(--discord)]/10 text-[var(--discord)]">
                  <s.icon className="h-5 w-5" />
                </div>
              </div>
              <h3 className="font-display text-3xl font-black tracking-tight">{s.title}</h3>
              <p className="font-body text-[14px] leading-relaxed text-white/55">{s.desc}</p>
              {i < steps.length - 1 && (
                <div className="absolute -right-3 top-1/2 hidden h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full border border-white/15 bg-black md:flex">
                  <ChevronRight className="h-3 w-3 text-white/60" />
                </div>
              )}
            </motion.li>
          ))}
        </ol>
      </div>
    </section>
  );
}

/* ============================================================ */
/* COMPARISON                                                    */
/* ============================================================ */

function Comparison() {
  const features = [
    'Freeform drag canvas',
    'Music sync (multiple sources)',
    'Discord-native widgets',
    'Custom cursor & text FX',
    'Game rank cards',
    'Vanity URLs without paywall',
    'Zero ads, zero tracking',
  ];
  const competitors = [
    { name: 'persn.me', us: true, score: features.map(() => true) },
    {
      name: 'Linktree',
      score: [false, false, false, false, false, false, false],
    },
    {
      name: 'Carrd',
      score: [true, false, false, false, false, true, false],
    },
    {
      name: 'guns.lol',
      score: [false, true, true, true, false, true, false],
    },
  ];
  return (
    <section id="compare" className="relative border-b border-white/[0.06] py-32 px-6">
      <div className="mx-auto max-w-[1240px]">
        <header className="mb-14 flex flex-col items-start gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="mb-4 flex items-center gap-2 font-mono-tight text-[10px] uppercase tracking-[0.24em] text-white/45">
              <span className="h-1 w-6 bg-[var(--magenta)]" />
              Receipts / Comparison
            </div>
            <h2 className="font-display text-[10vw] font-black leading-[0.9] tracking-[-0.02em] lg:text-[6rem]">
              VS. THE REST.
            </h2>
          </div>
          <p className="font-body max-w-sm text-[15px] leading-relaxed text-white/55">
            Most "link-in-bio" tools are a button list with a wallpaper.
            We're the editor.
          </p>
        </header>

        <div className="overflow-hidden rounded-2xl border border-white/[0.08]">
          <div className="grid grid-cols-[1.6fr_repeat(4,1fr)] border-b border-white/[0.08] bg-white/[0.03]">
            <div className="px-5 py-4 font-mono-tight text-[10px] uppercase tracking-[0.22em] text-white/40">
              Feature
            </div>
            {competitors.map((c) => (
              <div
                key={c.name}
                className={[
                  'border-l border-white/[0.08] px-5 py-4 text-center font-mono-tight text-[10px] uppercase tracking-[0.22em]',
                  c.us
                    ? 'bg-[var(--discord)]/10 text-white'
                    : 'text-white/40',
                ].join(' ')}
              >
                {c.us && (
                  <span className="mr-1 inline-block h-1.5 w-1.5 rounded-full bg-[var(--lime)]" />
                )}
                {c.name}
              </div>
            ))}
          </div>
          {features.map((f, i) => (
            <div
              key={f}
              className={[
                'grid grid-cols-[1.6fr_repeat(4,1fr)] border-b border-white/[0.05] last:border-b-0',
                i % 2 ? 'bg-white/[0.012]' : '',
              ].join(' ')}
            >
              <div className="px-5 py-4 font-body text-[14px] text-white/75">{f}</div>
              {competitors.map((c) => (
                <div
                  key={c.name + f}
                  className={[
                    'flex items-center justify-center border-l border-white/[0.05] px-5 py-4',
                    c.us ? 'bg-[var(--discord)]/[0.04]' : '',
                  ].join(' ')}
                >
                  {c.score[i] ? (
                    <Check
                      className={c.us ? 'h-4 w-4 text-[var(--lime)]' : 'h-4 w-4 text-white/40'}
                    />
                  ) : (
                    <X className="h-4 w-4 text-white/15" />
                  )}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ============================================================ */
/* FAQ                                                           */
/* ============================================================ */

function Faq() {
  const items = [
    {
      q: 'Is it really free?',
      a: 'Yes. The full editor, all widgets, and a vanity URL are free forever. No card required. No "premium effects." We may add an optional Pro tier later for hosting custom domains, but everything you see today stays free.',
    },
    {
      q: 'Do I need to sign up?',
      a: 'No. You can build a profile and your work lives encoded in the URL — share it without ever creating an account. Sign in only when you want to claim persn.me/yourname.',
    },
    {
      q: 'Can I import my Linktree / guns.lol / Carrd profile?',
      a: 'Not yet. Importing is on the roadmap. For now, copy-pasting links and uploading your avatar takes about 30 seconds in our editor.',
    },
    {
      q: 'Is there a mobile editor?',
      a: 'The editor works on tablets, but for serious building we recommend a laptop or desktop. Profiles you make are 100% mobile-friendly when viewed.',
    },
    {
      q: 'How is this different from a Discord bio?',
      a: 'Discord bios are plain text. persn.me is a full canvas — drag-and-drop widgets, music sync, game rank cards, custom cursors, the works. You can paste your persn.me link inside your Discord bio though, and it auto-embeds.',
    },
    {
      q: 'Where does my data live?',
      a: 'On your account, on our servers in the EU. We do not sell, rent, or share. No third-party trackers. Read the privacy page for the long version.',
    },
  ];
  const [open, setOpen] = useState(0);
  return (
    <section id="faq" className="relative border-b border-white/[0.06] py-32 px-6">
      <div className="mx-auto grid max-w-[1240px] gap-14 lg:grid-cols-12">
        <div className="lg:col-span-4">
          <div className="mb-4 flex items-center gap-2 font-mono-tight text-[10px] uppercase tracking-[0.24em] text-white/45">
            <span className="h-1 w-6 bg-[var(--discord)]" />
            FAQ / Common questions
          </div>
          <h2 className="font-display text-[12vw] font-black leading-[0.9] tracking-[-0.02em] lg:text-[5rem]">
            QUICK
            <br />
            ANSWERS.
          </h2>
          <p className="font-body mt-5 max-w-xs text-[14px] leading-relaxed text-white/55">
            Anything we missed?{' '}
            <a href="mailto:hi@persn.me" className="text-white underline-offset-2 hover:underline">
              hi@persn.me
            </a>
          </p>
        </div>
        <div className="lg:col-span-8">
          <ul className="divide-y divide-white/[0.07]">
            {items.map((item, i) => (
              <li key={i}>
                <button
                  type="button"
                  onClick={() => setOpen(open === i ? -1 : i)}
                  className="group flex w-full items-start justify-between gap-6 py-6 text-left transition"
                >
                  <div className="flex items-start gap-4">
                    <span className="font-mono-tight pt-1 text-[10px] uppercase tracking-[0.22em] text-white/30">
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <span className="font-display text-2xl font-black tracking-tight transition-colors group-hover:text-white md:text-3xl">
                      {item.q}
                    </span>
                  </div>
                  <span
                    className={[
                      'mt-1 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border border-white/10 transition-all',
                      open === i ? 'rotate-180 border-[var(--lime)]/40 bg-[var(--lime)]/10 text-[var(--lime)]' : 'text-white/40 group-hover:border-white/25',
                    ].join(' ')}
                  >
                    {open === i ? <Minus className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                  </span>
                </button>
                <AnimatePresence initial={false}>
                  {open === i && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                      className="overflow-hidden"
                    >
                      <p className="font-body pb-6 pl-12 pr-12 text-[15px] leading-relaxed text-white/60">
                        {item.a}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

/* ============================================================ */
/* FINAL CTA                                                     */
/* ============================================================ */

function FinalCta({ user }) {
  return (
    <section id="pricing" className="relative px-6 py-32">
      <div className="mx-auto max-w-[1240px]">
        <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-[#0c0c0c] to-black p-10 lg:p-20">
          <div className="absolute -right-32 -top-32 h-[500px] w-[500px] rounded-full bg-[var(--discord)]/20 blur-[120px]" />
          <div className="absolute -left-32 -bottom-32 h-[400px] w-[400px] rounded-full bg-[var(--magenta)]/15 blur-[120px]" />
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-[0.06]"
            style={{
              backgroundImage:
                'repeating-linear-gradient(0deg, white 0 1px, transparent 1px 28px), repeating-linear-gradient(90deg, white 0 1px, transparent 1px 28px)',
            }}
          />

          <div className="relative flex flex-col items-start gap-10">
            <div className="flex items-center gap-3 font-mono-tight text-[10px] uppercase tracking-[0.24em] text-white/45">
              <span className="flex items-center gap-1 rounded-full border border-[var(--lime)]/40 bg-[var(--lime)]/10 px-2.5 py-1 text-[var(--lime)]">
                <span className="h-1 w-1 rounded-full bg-[var(--lime)] shadow-[0_0_6px_var(--lime)]" />
                free forever
              </span>
              <span>· no card · 30s setup</span>
            </div>
            <h2 className="font-display text-[12vw] font-black leading-[0.86] tracking-[-0.02em] lg:text-[8.5rem]">
              STOP EXPLAINING <br />
              <span style={{ fontFamily: 'Playfair Display' }} className="italic font-medium text-white/55">who you are.</span>
              <br />
              <span className="bg-gradient-to-r from-[var(--lime)] via-white to-[var(--magenta)] bg-clip-text text-transparent">
                SHOW IT.
              </span>
            </h2>
            <p className="font-body max-w-2xl text-[17px] leading-relaxed text-white/65">
              Thirty seconds to a profile that actually looks like you. Pick your
              URL. Pin your Discord, your games, your music. Share it anywhere
              you live online.
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <Link
                to="/editor"
                className="group relative flex h-14 items-center gap-2 overflow-hidden rounded-md bg-white px-7 font-mono-tight text-[12px] font-bold uppercase tracking-[0.22em] text-black"
              >
                <span className="absolute inset-0 origin-left scale-x-0 bg-gradient-to-r from-[var(--lime)] to-[var(--magenta)] transition-transform duration-500 group-hover:scale-x-100" />
                <span className="relative">{user ? 'Open editor' : 'Build mine'}</span>
                <ArrowUpRight className="relative h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </Link>
              {user ? (
                <Link
                  to="/explore"
                  className="flex h-14 items-center gap-2 rounded-md border border-white/15 bg-white/[0.04] px-7 font-mono-tight text-[12px] font-bold uppercase tracking-[0.22em] text-white/85 backdrop-blur-md transition hover:border-[var(--discord)]/40 hover:bg-[var(--discord)]/10 hover:text-white"
                >
                  <Eye className="h-4 w-4" />
                  Browse the wall
                </Link>
              ) : (
                <Link
                  to="/register"
                  className="flex h-14 items-center gap-2 rounded-md border border-white/15 bg-white/[0.04] px-7 font-mono-tight text-[12px] font-bold uppercase tracking-[0.22em] text-white/85 backdrop-blur-md transition hover:border-[var(--discord)]/40 hover:bg-[var(--discord)]/10 hover:text-white"
                >
                  <Disc className="h-4 w-4" />
                  Sign up with Discord
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ============================================================ */
/* FOOTER                                                        */
/* ============================================================ */

function Footer() {
  const cols = [
    {
      title: 'Product',
      links: [
        ['Editor', '/editor'],
        ['Explore', '/explore'],
        ['Leaderboard', '/clicker'],
        ['Changelog', '#'],
      ],
    },
    {
      title: 'Account',
      links: [
        ['Sign in', '/login'],
        ['Create account', '/register'],
        ['Privacy', '#'],
        ['Terms', '#'],
      ],
    },
    {
      title: 'Community',
      links: [
        ['Discord', '#'],
        ['Twitter', '#'],
        ['GitHub', '#'],
        ['Feedback', '#'],
      ],
    },
  ];
  return (
    <footer className="relative border-t border-white/[0.06] px-6 py-16">
      <div className="mx-auto grid max-w-[1440px] gap-12 lg:grid-cols-[1.5fr_1fr_1fr_1fr]">
        <div className="space-y-5">
          <Wordmark />
          <p className="font-body max-w-xs text-[13px] leading-relaxed text-white/45">
            A freeform profile builder. Built in France for gamers, creators,
            and anyone tired of templates.
          </p>
          <div className="flex items-center gap-3">
            <a
              href="#"
              aria-label="Discord"
              className="flex h-9 w-9 items-center justify-center rounded-md border border-white/10 text-white/55 transition hover:border-white/30 hover:text-white"
            >
              <Disc className="h-4 w-4" />
            </a>
            <a
              href="#"
              aria-label="Twitter"
              className="flex h-9 w-9 items-center justify-center rounded-md border border-white/10 text-white/55 transition hover:border-white/30 hover:text-white"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24h-6.66l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231 5.45-6.231Zm-1.161 17.52h1.833L7.084 4.126H5.117l11.966 15.644Z" />
              </svg>
            </a>
            <a
              href="#"
              aria-label="GitHub"
              className="flex h-9 w-9 items-center justify-center rounded-md border border-white/10 text-white/55 transition hover:border-white/30 hover:text-white"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                <path d="M12 .5C5.73.5.5 5.73.5 12c0 5.08 3.29 9.39 7.86 10.91.58.1.79-.25.79-.56 0-.28-.01-1.02-.02-2-3.2.69-3.88-1.54-3.88-1.54-.52-1.32-1.27-1.67-1.27-1.67-1.04-.71.08-.7.08-.7 1.15.08 1.76 1.18 1.76 1.18 1.02 1.76 2.69 1.25 3.34.96.1-.74.4-1.25.72-1.54-2.55-.29-5.24-1.28-5.24-5.69 0-1.26.45-2.28 1.18-3.09-.12-.29-.51-1.46.11-3.04 0 0 .97-.31 3.18 1.18.92-.26 1.91-.39 2.89-.39.98 0 1.97.13 2.89.39 2.21-1.49 3.18-1.18 3.18-1.18.62 1.58.23 2.75.11 3.04.74.81 1.18 1.83 1.18 3.09 0 4.42-2.69 5.39-5.25 5.68.41.36.78 1.06.78 2.13 0 1.54-.01 2.78-.01 3.16 0 .31.21.67.8.56C20.71 21.39 24 17.08 24 12c0-6.27-5.23-11.5-12-11.5Z" />
              </svg>
            </a>
          </div>
        </div>
        {cols.map((c) => (
          <div key={c.title}>
            <h4 className="mb-4 font-mono-tight text-[10px] uppercase tracking-[0.24em] text-white/40">
              {c.title}
            </h4>
            <ul className="space-y-2.5">
              {c.links.map(([label, href]) => (
                <li key={label}>
                  <Link
                    to={href}
                    className="font-body text-[13px] text-white/60 transition hover:text-white"
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="mx-auto mt-14 flex max-w-[1440px] items-center justify-between border-t border-white/[0.06] pt-6 font-mono-tight text-[10px] uppercase tracking-[0.24em] text-white/30">
        <span>© 2026 persn.me · all rights reserved</span>
        <span className="flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-[var(--lime)] shadow-[0_0_6px_var(--lime)]" />
          status: shipping
        </span>
      </div>
    </footer>
  );
}
