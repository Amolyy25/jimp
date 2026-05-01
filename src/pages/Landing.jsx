import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
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
} from 'lucide-react';
import logo from '../image/logo.jpeg';

/**
 * Landing page — "Terminal-editorial" aesthetic.
 *
 * Visual language:
 *   - Bebas Neue for hero/display (tall, confident, gen-Z-editorial)
 *   - JetBrains Mono for every system label / eyebrow (CLI / Raycast feel)
 *   - Inter reserved for body paragraphs
 *   - Single accent: Discord violet (#5865F2)
 *   - Subtle SVG grid + radial spotlight for background atmosphere
 *   - Mockup in hero is a real-ish fake profile with live animations so the
 *     product idea is obvious in under 2 seconds.
 */
export default function Landing() {
  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[#050505] text-white">
      <GridBackdrop />
      <Spotlight />

      <Nav />

      <Hero />
      <Marquee />
      <Features />
      <HowItWorks />
      <FinalCta />
      <Footer />
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* NAV                                                                        */
/* -------------------------------------------------------------------------- */

function Nav() {
  return (
    <nav className="fixed left-0 right-0 top-0 z-50 border-b border-white/[0.04] bg-black/40 backdrop-blur-xl">
      <div className="mx-auto flex max-w-[1400px] items-center justify-between px-6 py-3">
        <Wordmark />
        <div className="hidden items-center gap-8 md:flex">
          <NavLink href="/explore" isExternal>Explore</NavLink>
          <NavLink href="#features">Features</NavLink>
          <NavLink href="#how">How it works</NavLink>
        </div>
        <div className="flex items-center gap-3">
          <Link
            to="/login"
            className="font-mono text-[11px] uppercase tracking-[0.18em] text-white/50 transition hover:text-white"
          >
            Sign in
          </Link>
          <Link
            to="/register"
            className="group flex h-8 items-center gap-1.5 rounded-md bg-white px-3.5 font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-black transition hover:bg-white/90"
          >
            Get Started
            <ArrowUpRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </Link>
        </div>
      </div>
    </nav>
  );
}

function NavLink({ href, children, isExternal }) {
  if (isExternal) {
    return (
      <Link
        to={href}
        className="font-mono text-[11px] uppercase tracking-[0.18em] text-white/50 transition hover:text-white"
      >
        {children}
      </Link>
    );
  }
  return (
    <a
      href={href}
      className="font-mono text-[11px] uppercase tracking-[0.18em] text-white/50 transition hover:text-white"
    >
      {children}
    </a>
  );
}

function Wordmark() {
  return (
    <Link to="/" className="flex items-center gap-2.5">
      <img
        src={logo}
        alt="persn.me"
        className="h-8 w-8 rounded-md object-cover ring-1 ring-white/10"
      />
      <div className="flex items-baseline gap-2">
        <span
          className="text-xl font-black leading-none tracking-tight"
          style={{ fontFamily: 'Bebas Neue' }}
        >
          PERSN.ME
        </span>
        <span className="font-mono text-[9px] uppercase tracking-[0.24em] text-white/30">
          v2.4
        </span>
      </div>
    </Link>
  );
}

/* -------------------------------------------------------------------------- */
/* HERO                                                                       */
/* -------------------------------------------------------------------------- */

function Hero() {
  return (
    <section className="relative pt-32 pb-16 lg:pt-40 lg:pb-24">
      <div className="mx-auto grid max-w-[1400px] grid-cols-1 gap-14 px-6 lg:grid-cols-12 lg:gap-10">
        <div className="relative lg:col-span-6">
          <motion.div
            initial="hidden"
            animate="show"
            variants={{
              hidden: {},
              show: { transition: { staggerChildren: 0.06, delayChildren: 0.1 } },
            }}
            className="space-y-8"
          >
            <motion.div variants={fadeUp} className="flex items-center gap-3">
              <span className="flex h-1.5 w-1.5 rounded-full bg-discord shadow-[0_0_12px_#5865F2]" />
              <span className="font-mono text-[10px] uppercase tracking-[0.24em] text-white/50">
                Profile Builder / v2.4
              </span>
            </motion.div>

            <motion.h1
              variants={fadeUp}
              className="text-[12vw] font-black leading-[0.86] tracking-[-0.02em] lg:text-[8.5rem]"
              style={{ fontFamily: 'Bebas Neue' }}
            >
              YOUR PROFILE.
              <br />
              <span className="relative inline-block">
                <span className="relative z-10 bg-gradient-to-br from-white via-white to-discord bg-clip-text text-transparent">
                  YOUR RULES.
                </span>
                <span
                  aria-hidden
                  className="absolute -inset-x-2 -inset-y-1 -z-0 rounded-[2px] bg-discord/10 blur-2xl"
                />
              </span>
            </motion.h1>

            <motion.p
              variants={fadeUp}
              className="max-w-md text-[17px] font-light leading-relaxed text-white/55"
            >
              The freeform profile builder for gamers. Drag widgets on a canvas,
              sync your music, claim a URL — then flex it in your Discord bio.
            </motion.p>

            <motion.div variants={fadeUp} className="flex flex-wrap items-center gap-3">
              <Link
                to="/editor"
                className="group relative flex h-12 items-center gap-2 overflow-hidden rounded-md bg-discord px-5 font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-white transition"
              >
                <span className="absolute inset-0 bg-gradient-to-b from-white/15 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
                <span className="relative">Start Building</span>
                <ArrowUpRight className="relative h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </Link>
              <Link
                to="/login"
                className="flex h-12 items-center gap-2 rounded-md border border-white/10 bg-white/[0.03] px-5 font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-white/80 transition hover:border-white/20 hover:bg-white/[0.06]"
              >
                <Command className="h-3.5 w-3.5" />
                Sign In
              </Link>
            </motion.div>

            <motion.div
              variants={fadeUp}
              className="flex items-center gap-6 pt-4 font-mono text-[10px] uppercase tracking-[0.22em] text-white/30"
            >
              <span className="flex items-center gap-1.5">
                <Check className="h-3 w-3" /> Free forever
              </span>
              <span className="flex items-center gap-1.5">
                <Check className="h-3 w-3" /> No card
              </span>
              <span className="flex items-center gap-1.5">
                <Check className="h-3 w-3" /> 30s setup
              </span>
            </motion.div>
          </motion.div>
        </div>

        <div className="relative lg:col-span-6">
          <HeroMockup />
        </div>
      </div>
    </section>
  );
}

const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] },
  },
};

/* -------------------------------------------------------------------------- */
/* HERO MOCKUP — a real-looking fake profile to communicate the product       */
/* -------------------------------------------------------------------------- */

function HeroMockup() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
      className="relative aspect-[4/5] w-full max-w-[520px] lg:max-w-none"
    >
      {/* Window chrome */}
      <div className="absolute inset-0 overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-[#0a0a0a] to-[#050505] shadow-[0_30px_80px_rgba(0,0,0,0.5)]">
        {/* Top bar */}
        <div className="flex items-center justify-between border-b border-white/5 px-4 py-2.5">
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-white/10" />
            <span className="h-2.5 w-2.5 rounded-full bg-white/10" />
            <span className="h-2.5 w-2.5 rounded-full bg-white/10" />
          </div>
          <div className="rounded-sm bg-white/5 px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.18em] text-white/30">
            persn.me / yourname
          </div>
          <div className="w-[34px]" />
        </div>

        {/* Canvas with blurred bg */}
        <div className="relative h-[calc(100%-38px)] overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,#5865F255,transparent_50%),radial-gradient(circle_at_90%_90%,#8b5cf644,transparent_40%)]" />
          <div className="absolute inset-0 bg-black/30" />
          <div
            className="absolute inset-0 opacity-[0.06]"
            style={{
              backgroundImage:
                'repeating-linear-gradient(0deg, white 0 1px, transparent 1px 40px), repeating-linear-gradient(90deg, white 0 1px, transparent 1px 40px)',
            }}
          />

          {/* Avatar + identity */}
          <motion.div
            {...floatAnim(0)}
            className="absolute left-5 top-5 flex items-start gap-3"
          >
            <div className="relative">
              <div className="absolute inset-0 -m-1 rounded-full border border-discord/60" />
              <div className="absolute inset-0 -m-2 animate-ping rounded-full border border-discord/30" />
              <div className="relative h-12 w-12 overflow-hidden rounded-full border border-white/10 bg-gradient-to-br from-violet-400 to-discord" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span
                  className="text-xl font-black tracking-tight text-white"
                  style={{ fontFamily: 'Bebas Neue' }}
                >
                  YOURNAME
                </span>
                <span
                  className="inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[7px] font-bold uppercase tracking-wider text-white"
                  style={{
                    background:
                      'linear-gradient(135deg, #ff73fa, #5865F2, #3ba9ff)',
                  }}
                >
                  <Zap className="h-2 w-2" /> Nitro
                </span>
              </div>
              <div className="font-mono text-[8px] uppercase tracking-[0.18em] text-white/40">
                PARIS · BUILDING
              </div>
            </div>
          </motion.div>

          {/* Clock chip (top right) */}
          <motion.div
            {...floatAnim(1)}
            className="absolute right-5 top-5 rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-1.5 backdrop-blur-md"
          >
            <div className="font-mono text-[8px] uppercase tracking-[0.18em] text-white/40">
              Local
            </div>
            <div className="font-mono text-sm font-bold tabular-nums">14:32</div>
          </motion.div>

          {/* Games grid (center-left) */}
          <motion.div
            {...floatAnim(2)}
            className="absolute left-5 top-[130px] flex gap-2"
          >
            {[
              { name: 'VALORANT', rank: 'Immortal', c: 'from-red-500 to-rose-700' },
              { name: 'LOL', rank: 'Diamond', c: 'from-sky-400 to-indigo-600' },
              { name: 'CS2', rank: 'LE', c: 'from-orange-400 to-amber-700' },
            ].map((g) => (
              <div
                key={g.name}
                className="relative h-20 w-16 overflow-hidden rounded-lg border border-white/10"
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${g.c}`} />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
                <div className="absolute inset-x-0 bottom-1 px-1.5">
                  <div
                    className="truncate text-[9px] font-black text-white"
                    style={{ fontFamily: 'Bebas Neue' }}
                  >
                    {g.name}
                  </div>
                  <div className="truncate font-mono text-[7px] uppercase text-white/40">
                    {g.rank}
                  </div>
                </div>
              </div>
            ))}
          </motion.div>

          {/* Discord server card */}
          <motion.div
            {...floatAnim(3)}
            className="absolute right-5 top-[130px] flex w-[200px] items-center gap-2.5 rounded-xl border border-white/10 bg-white/[0.04] p-2.5 backdrop-blur-md"
          >
            <div className="h-9 w-9 flex-shrink-0 rounded-lg bg-gradient-to-br from-discord to-violet-500" />
            <div className="min-w-0 flex-1">
              <div className="truncate text-[11px] font-bold">persn.me HQ</div>
              <div className="truncate font-mono text-[8px] text-white/40">
                4.2k members online
              </div>
            </div>
          </motion.div>

          {/* Music progress (bottom) */}
          <motion.div
            {...floatAnim(4)}
            className="absolute inset-x-5 bottom-5 rounded-xl border border-white/10 bg-white/[0.04] p-3 backdrop-blur-md"
          >
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-md bg-discord">
                <Music className="h-3.5 w-3.5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-mono text-[8px] uppercase tracking-[0.18em] text-white/40">
                  Now playing
                </div>
                <div className="truncate text-[11px] font-bold">
                  Daft Punk — Digital Love
                </div>
              </div>
              <div className="font-mono text-[9px] tabular-nums text-white/40">
                1:45 / 4:58
              </div>
            </div>
            <div className="mt-2 h-0.5 w-full overflow-hidden rounded-full bg-white/10">
              <div className="h-full w-[36%] rounded-full bg-discord" />
            </div>
          </motion.div>

          {/* Ghost "drop here" outline — teases the drag-and-drop promise */}
          <div className="absolute bottom-[92px] right-5 flex h-14 w-20 items-center justify-center rounded-lg border border-dashed border-white/15 font-mono text-[8px] uppercase tracking-[0.2em] text-white/25">
            Drop
          </div>
        </div>
      </div>

      {/* Glow */}
      <div className="pointer-events-none absolute -inset-8 -z-10 bg-[radial-gradient(circle_at_center,#5865F222,transparent_60%)]" />
    </motion.div>
  );
}

function floatAnim(i) {
  return {
    initial: { opacity: 0, y: 10 },
    animate: { opacity: 1, y: 0 },
    transition: { delay: 0.4 + i * 0.12, duration: 0.6, ease: [0.22, 1, 0.36, 1] },
  };
}

/* -------------------------------------------------------------------------- */
/* MARQUEE                                                                    */
/* -------------------------------------------------------------------------- */

function Marquee() {
  const items = [
    'Freeform canvas',
    'Drag & drop',
    'Music sync',
    'Discord Nitro',
    'Vanity URLs',
    'Clip previews',
    'Custom cursor',
    'YouTube · Spotify · SoundCloud',
    'Weather · Clock · Visitors',
    'Snap guides',
  ];

  return (
    <section className="relative border-y border-white/5 bg-black/40 py-5">
      <div className="flex overflow-hidden whitespace-nowrap [mask-image:linear-gradient(to_right,transparent,black_10%,black_90%,transparent)]">
        <div className="flex animate-[marquee_40s_linear_infinite] items-center gap-10 pr-10">
          {[...items, ...items].map((it, i) => (
            <span
              key={i}
              className="flex items-center gap-3 font-mono text-[11px] uppercase tracking-[0.22em] text-white/40"
            >
              <span className="inline-block h-1 w-1 rounded-full bg-discord" />
              {it}
            </span>
          ))}
        </div>
      </div>
      {/* keyframes live inline to avoid touching tailwind config */}
      <style>{`@keyframes marquee { from { transform: translateX(0); } to { transform: translateX(-50%); } }`}</style>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/* FEATURES                                                                   */
/* -------------------------------------------------------------------------- */

function Features() {
  const features = [
    {
      n: '01',
      icon: Layers,
      title: 'FREEFORM CANVAS',
      desc: 'No grid, no templates. Drag widgets anywhere. Snap guides, center-lock and pixel-clean alignment come for free.',
    },
    {
      n: '02',
      icon: Music,
      title: 'MUSIC SYNC',
      desc: 'Paste a YouTube, Spotify or direct mp3 — the player ties progress, now-playing and a pulse ring around your avatar.',
    },
    {
      n: '03',
      icon: Globe,
      title: 'VANITY URLS',
      desc: 'Claim persn.me/yourname. URL is yours — locked for 7 days after every rename to stop squatting.',
    },
    {
      n: '04',
      icon: Gamepad2,
      title: 'GAMER FIRST',
      desc: 'Rank cards, video clips on hover, Discord server widgets, Nitro badge — built around what flexing actually looks like.',
    },
    {
      n: '05',
      icon: Sparkles,
      title: 'DETAILS',
      desc: 'Custom cursors. Backdrop blur per widget. Text effects (glow, gradient, glitch). Every element is tweakable.',
    },
    {
      n: '06',
      icon: Lock,
      title: 'YOUR DATA',
      desc: 'Profiles live on your account — or encoded directly in a URL if you prefer zero-signup. No tracking, no ads.',
    },
  ];

  return (
    <section id="features" className="relative py-32 px-6">
      <div className="mx-auto max-w-[1400px]">
        <header className="mb-16 flex flex-col items-start gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="mb-4 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.24em] text-white/40">
              <span className="h-1 w-6 bg-discord" />
              Features / 06
            </div>
            <h2
              className="max-w-3xl text-[9vw] font-black leading-[0.9] tracking-[-0.02em] lg:text-[5rem]"
              style={{ fontFamily: 'Bebas Neue' }}
            >
              EVERY LEVER,
              <br />
              WITHOUT THE BLOAT.
            </h2>
          </div>
          <p className="max-w-sm text-sm leading-relaxed text-white/50">
            Built from the ground up for people who care how their profile looks.
            Not another Linktree. Not a template farm.
          </p>
        </header>

        <div className="grid gap-px overflow-hidden rounded-xl border border-white/5 bg-white/5 md:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <FeatureCard key={f.n} {...f} />
          ))}
        </div>
      </div>
    </section>
  );
}

function FeatureCard({ n, icon: Icon, title, desc }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="group relative flex flex-col gap-6 bg-[#0a0a0a] p-8 transition-colors hover:bg-[#0d0d0d]"
    >
      <div className="flex items-start justify-between">
        <span className="font-mono text-[10px] uppercase tracking-[0.24em] text-white/25">
          {n}
        </span>
        <div className="flex h-9 w-9 items-center justify-center rounded-md border border-white/10 bg-white/[0.02] text-white/60 transition-all group-hover:border-discord/40 group-hover:bg-discord/10 group-hover:text-discord">
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <h3
        className="text-3xl font-black leading-none tracking-tight"
        style={{ fontFamily: 'Bebas Neue' }}
      >
        {title}
      </h3>
      <p className="text-sm leading-relaxed text-white/50">{desc}</p>
      <ArrowUpRight className="absolute bottom-6 right-6 h-4 w-4 text-white/10 transition-all group-hover:text-discord" />
    </motion.div>
  );
}

/* -------------------------------------------------------------------------- */
/* HOW IT WORKS                                                               */
/* -------------------------------------------------------------------------- */

function HowItWorks() {
  const steps = [
    {
      n: '01',
      title: 'OPEN THE EDITOR',
      desc: 'Start blank or fork the default layout. No account needed to experiment.',
    },
    {
      n: '02',
      title: 'DRAG. TWEAK. PLAY.',
      desc: 'Move widgets around. Tune transparency, blur, text effects. Preview in one tab while you edit in another.',
    },
    {
      n: '03',
      title: 'CLAIM & SHIP',
      desc: 'Sign in, pick your URL, hit claim. You get persn.me/yourname — locked to your account.',
    },
  ];

  return (
    <section id="how" className="relative py-32 px-6">
      <div className="mx-auto max-w-[1400px]">
        <header className="mb-16 max-w-2xl">
          <div className="mb-4 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.24em] text-white/40">
            <span className="h-1 w-6 bg-discord" />
            Workflow
          </div>
          <h2
            className="text-[9vw] font-black leading-[0.9] tracking-[-0.02em] lg:text-[5rem]"
            style={{ fontFamily: 'Bebas Neue' }}
          >
            THREE STEPS.
            <br />
            THAT'S IT.
          </h2>
        </header>

        <ol className="grid gap-6 md:grid-cols-3">
          {steps.map((s, i) => (
            <motion.li
              key={s.n}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className="relative flex flex-col gap-4 rounded-xl border border-white/5 bg-white/[0.02] p-7"
            >
              <div className="flex items-center justify-between">
                <span
                  className="text-6xl font-black leading-none text-discord"
                  style={{ fontFamily: 'Bebas Neue' }}
                >
                  {s.n}
                </span>
                <span className="font-mono text-[9px] uppercase tracking-[0.22em] text-white/30">
                  Step
                </span>
              </div>
              <h3
                className="text-2xl font-black tracking-tight"
                style={{ fontFamily: 'Bebas Neue' }}
              >
                {s.title}
              </h3>
              <p className="text-sm leading-relaxed text-white/50">{s.desc}</p>
            </motion.li>
          ))}
        </ol>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/* FINAL CTA                                                                  */
/* -------------------------------------------------------------------------- */

function FinalCta() {
  return (
    <section id="pricing" className="relative px-6 py-32">
      <div className="mx-auto max-w-[1200px]">
        <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-[#0c0c0c] to-black p-12 lg:p-20">
          <div className="absolute -right-20 -top-20 h-[400px] w-[400px] rounded-full bg-discord/15 blur-3xl" />
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.06]"
            style={{
              backgroundImage:
                'repeating-linear-gradient(0deg, white 0 1px, transparent 1px 32px), repeating-linear-gradient(90deg, white 0 1px, transparent 1px 32px)',
            }}
          />

          <div className="relative flex flex-col items-start gap-8">
            <div className="font-mono text-[10px] uppercase tracking-[0.24em] text-white/40">
              [ Free forever / no card ]
            </div>
            <h2
              className="text-[10vw] font-black leading-[0.88] tracking-[-0.02em] lg:text-[7rem]"
              style={{ fontFamily: 'Bebas Neue' }}
            >
              STOP EXPLAINING <br />
              <span className="text-discord">WHO YOU ARE.</span>
              <br />
              SHOW IT.
            </h2>
            <p className="max-w-xl text-base leading-relaxed text-white/60">
              Thirty seconds to a profile that actually looks like you. Pick your
              URL, pin your Discord, your games, your music. Share it anywhere.
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <Link
                to="/editor"
                className="group flex h-12 items-center gap-2 rounded-md bg-white px-6 font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-black transition hover:bg-white/90"
              >
                Build yours
                <ArrowUpRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </Link>
              <Link
                to="/register"
                className="flex h-12 items-center gap-2 rounded-md border border-white/10 bg-white/[0.03] px-6 font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-white/80 transition hover:border-discord/40 hover:bg-discord/10 hover:text-white"
              >
                Create account
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/* FOOTER                                                                     */
/* -------------------------------------------------------------------------- */

function Footer() {
  const cols = [
    {
      title: 'Product',
      links: ['Editor', 'Features', 'How it works', 'Changelog'],
    },
    { title: 'Account', links: ['Sign in', 'Create account', 'Privacy', 'Terms'] },
    { title: 'Community', links: ['Discord', 'Twitter', 'GitHub', 'Feedback'] },
  ];

  return (
    <footer className="relative border-t border-white/5 px-6 py-14">
      <div className="mx-auto grid max-w-[1400px] gap-12 lg:grid-cols-[1.5fr_1fr_1fr_1fr]">
        <div className="space-y-4">
          <Wordmark />
          <p className="max-w-xs text-xs leading-relaxed text-white/40">
            A freeform profile builder. Built in France. For gamers, creators,
            and anyone tired of templates.
          </p>
        </div>
        {cols.map((c) => (
          <div key={c.title}>
            <h4 className="mb-4 font-mono text-[10px] uppercase tracking-[0.24em] text-white/40">
              {c.title}
            </h4>
            <ul className="space-y-2.5">
              {c.links.map((l) => (
                <li key={l}>
                  <a
                    href="#"
                    className="text-[13px] text-white/60 transition hover:text-white"
                  >
                    {l}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="mx-auto mt-12 flex max-w-[1400px] items-center justify-between border-t border-white/5 pt-6 font-mono text-[10px] uppercase tracking-[0.24em] text-white/30">
        <span>© 2026 persn.me</span>
        <span>All rights reserved</span>
      </div>
    </footer>
  );
}

/* -------------------------------------------------------------------------- */
/* BACKGROUND CHROME                                                          */
/* -------------------------------------------------------------------------- */

function GridBackdrop() {
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-0 opacity-[0.035]"
      style={{
        backgroundImage:
          'repeating-linear-gradient(0deg, white 0 1px, transparent 1px 48px), repeating-linear-gradient(90deg, white 0 1px, transparent 1px 48px)',
      }}
    />
  );
}

function Spotlight() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-0">
      <div className="absolute -top-40 left-1/2 h-[600px] w-[800px] -translate-x-1/2 rounded-full bg-discord/10 blur-[120px]" />
      <div className="absolute bottom-[-10%] right-[-10%] h-[500px] w-[500px] rounded-full bg-violet-500/5 blur-[120px]" />
    </div>
  );
}
