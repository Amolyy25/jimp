import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowUpRight,
  Compass,
  Clock,
  Trophy,
  Music,
  MessageSquare,
  Cloud,
  Share2,
  Award,
  HelpCircle,
  Tv,
  Gamepad2,
  MousePointer2,
  Eye,
  Activity,
  Server,
  Search,
} from 'lucide-react';
import { motion, AnimatePresence, useMotionValue } from 'framer-motion';
import { getExploreFeed } from '../utils/api.js';

/**
 * Public profile directory — editorial-terminal aesthetic.
 *   - Bebas Neue / JetBrains Mono / Outfit
 *   - 3D tilt cards
 *   - Recent vs Most-clicked toggle
 *   - Load-more pagination
 */
export default function Explore() {
  const [sort, setSort] = useState('recent');
  const [entries, setEntries] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setEntries([]);
    setPage(1);
    (async () => {
      const res = await getExploreFeed({ page: 1, sort });
      if (cancelled) return;
      setEntries(res.entries || []);
      setHasMore(!!res.hasMore);
      setTotal(res.total || 0);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [sort]);

  const loadMore = async () => {
    const next = page + 1;
    setLoading(true);
    const res = await getExploreFeed({ page: next, sort });
    setEntries((prev) => [...prev, ...(res.entries || [])]);
    setHasMore(!!res.hasMore);
    setPage(next);
    setLoading(false);
  };

  const filtered = query
    ? entries.filter(
        (e) =>
          e.username.toLowerCase().includes(query.toLowerCase()) ||
          e.slug.toLowerCase().includes(query.toLowerCase()) ||
          (e.bio || '').toLowerCase().includes(query.toLowerCase()),
      )
    : entries;

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#050505] text-white antialiased">
      <Backdrop />

      <header className="relative z-10 border-b border-white/[0.06] bg-black/40 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1400px] items-center justify-between px-6 py-4">
          <Link
            to="/"
            className="font-mono-tight text-[10px] uppercase tracking-[0.22em] text-white/55 transition hover:text-white"
          >
            ← persn.me
          </Link>
          <div className="hidden items-center gap-6 md:flex">
            <span className="font-mono-tight text-[10px] uppercase tracking-[0.22em] text-white/35">
              {total.toLocaleString()} profiles indexed
            </span>
          </div>
          <Link
            to="/clicker"
            className="flex items-center gap-1.5 font-mono-tight text-[10px] uppercase tracking-[0.22em] text-white/65 transition hover:text-white"
          >
            <Trophy className="h-3.5 w-3.5" />
            Leaderboard
          </Link>
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-[1400px] px-6 py-14 md:py-20">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="mb-10"
        >
          <div className="mb-5 flex items-center gap-2 font-mono-tight text-[10px] uppercase tracking-[0.24em] text-white/50">
            <Compass className="h-3 w-3 text-[#5865F2]" />
            <span>The wall / community</span>
          </div>
          <h1
            className="text-[12vw] font-black leading-[0.86] tracking-[-0.02em] md:text-[6.5rem]"
            style={{ fontFamily: 'Bebas Neue' }}
          >
            EXPLORE THE
            <br />
            <span style={{ fontFamily: 'Playfair Display' }} className="italic font-medium text-white/55">
              real
            </span>{' '}
            <span className="bg-gradient-to-r from-white via-white to-[#5865F2] bg-clip-text text-transparent">
              ONES.
            </span>
          </h1>
          <p
            className="mt-4 max-w-xl text-[15px] leading-relaxed text-white/55"
            style={{ fontFamily: 'Outfit, Inter, sans-serif' }}
          >
            {total.toLocaleString()} profile{total === 1 ? '' : 's'} building their
            corner of the internet. Steal an idea — then make it weirder.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.5 }}
          className="mb-12 flex flex-col gap-4 md:flex-row md:items-center md:justify-between"
        >
          <div className="relative flex-1 max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="search @handle, slug, bio…"
              className="w-full rounded-md border border-white/[0.08] bg-white/[0.02] py-2.5 pl-10 pr-4 font-mono-tight text-[12px] text-white placeholder:text-white/25 transition focus:border-[#5865F2]/40 focus:bg-white/[0.04] focus:outline-none"
            />
          </div>
          <div className="flex items-center rounded-full border border-white/[0.08] bg-black/40 p-1 backdrop-blur-md">
            <SortPill
              active={sort === 'recent'}
              onClick={() => setSort('recent')}
              icon={Clock}
            >
              Recent
            </SortPill>
            <SortPill
              active={sort === 'clicker'}
              onClick={() => setSort('clicker')}
              icon={Trophy}
            >
              Most clicked
            </SortPill>
          </div>
        </motion.div>

        {loading && entries.length === 0 && (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        )}

        {filtered.length === 0 && !loading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="rounded-2xl border border-dashed border-white/[0.08] bg-white/[0.01] p-16 text-center"
          >
            <p className="font-mono-tight text-[11px] uppercase tracking-[0.24em] text-white/30">
              {query ? 'no match for this query — try fewer letters' : 'no profiles to show yet — be the first'}
            </p>
          </motion.div>
        )}

        <motion.div
          layout
          className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
        >
          <AnimatePresence mode="popLayout">
            {filtered.map((p, i) => (
              <ProfileCard key={p.slug} profile={p} index={i} />
            ))}
          </AnimatePresence>
        </motion.div>

        {hasMore && (
          <div className="mt-16 flex justify-center">
            <button
              type="button"
              onClick={loadMore}
              disabled={loading}
              className="group relative flex h-12 items-center gap-2 overflow-hidden rounded-md border border-white/[0.08] bg-white/[0.02] px-7 font-mono-tight text-[11px] font-bold uppercase tracking-[0.22em] text-white/75 transition hover:border-white/25 hover:text-white disabled:opacity-50"
            >
              <span className="absolute inset-0 origin-left scale-x-0 bg-gradient-to-r from-[#5865F2]/20 via-[#ff2e88]/15 to-[#c0ff3e]/15 transition-transform duration-500 group-hover:scale-x-100" />
              <span className="relative">{loading ? 'Syncing…' : 'Load more profiles'}</span>
              <ArrowUpRight className="relative h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </button>
          </div>
        )}
      </main>

      <style>{`
        :root {
          --discord: #5865F2;
          --lime: #c0ff3e;
          --magenta: #ff2e88;
        }
        .font-mono-tight { font-family: 'JetBrains Mono', monospace; }
      `}</style>
    </div>
  );
}

function Backdrop() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-0">
      <motion.div
        animate={{ scale: [1, 1.18, 1], opacity: [0.18, 0.32, 0.18], x: [0, 80, 0], y: [0, 40, 0] }}
        transition={{ duration: 22, repeat: Infinity, ease: 'linear' }}
        className="absolute -left-[10%] -top-[10%] h-[60%] w-[60%] rounded-full bg-[#5865F2]/12 blur-[120px]"
      />
      <motion.div
        animate={{ scale: [1.15, 1, 1.15], opacity: [0.1, 0.22, 0.1], x: [0, -100, 0], y: [0, -50, 0] }}
        transition={{ duration: 26, repeat: Infinity, ease: 'linear' }}
        className="absolute -right-[10%] -bottom-[10%] h-[60%] w-[60%] rounded-full bg-[#ff2e88]/[0.05] blur-[120px]"
      />
      <div
        className="absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage:
            'repeating-linear-gradient(0deg, white 0 1px, transparent 1px 56px), repeating-linear-gradient(90deg, white 0 1px, transparent 1px 56px)',
        }}
      />
    </div>
  );
}

function SortPill({ active, onClick, icon: Icon, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'relative flex items-center gap-1.5 rounded-full px-4 py-2 font-mono-tight text-[10px] uppercase tracking-[0.22em] transition-all duration-300',
        active ? 'text-black' : 'text-white/55 hover:text-white',
      ].join(' ')}
    >
      {active && (
        <motion.div
          layoutId="active-pill"
          className="absolute inset-0 rounded-full bg-white shadow-[0_2px_18px_rgba(255,255,255,0.18)]"
          transition={{ type: 'spring', bounce: 0.25, duration: 0.5 }}
        />
      )}
      <Icon className="relative z-10 h-3 w-3" />
      <span className="relative z-10">{children}</span>
    </button>
  );
}

function SkeletonCard() {
  return (
    <div className="rounded-2xl border border-white/[0.06] bg-white/[0.015] p-6">
      <div className="flex items-center gap-4">
        <div className="h-14 w-14 animate-pulse rounded-2xl bg-white/[0.04]" />
        <div className="flex-1 space-y-2">
          <div className="h-3 w-2/3 animate-pulse rounded bg-white/[0.04]" />
          <div className="h-2 w-1/2 animate-pulse rounded bg-white/[0.03]" />
        </div>
      </div>
      <div className="mt-5 h-2 w-full animate-pulse rounded bg-white/[0.03]" />
      <div className="mt-2 h-2 w-3/4 animate-pulse rounded bg-white/[0.03]" />
      <div className="mt-5 flex gap-1.5">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-7 w-7 animate-pulse rounded-lg bg-white/[0.03]" />
        ))}
      </div>
    </div>
  );
}

function ProfileCard({ profile, index }) {
  const accent = profile.accent || '#5865F2';
  const ref = useRef(null);
  const rx = useMotionValue(0);
  const ry = useMotionValue(0);
  const onMove = (e) => {
    const r = ref.current?.getBoundingClientRect();
    if (!r) return;
    const x = (e.clientX - r.left) / r.width - 0.5;
    const y = (e.clientY - r.top) / r.height - 0.5;
    rx.set(-y * 6);
    ry.set(x * 7);
  };
  const onLeave = () => {
    rx.set(0);
    ry.set(0);
  };

  const displayWidgets = Array.from(new Set(profile.widgets || []))
    .filter((type) => type !== 'avatar' && type !== 'group' && WIDGET_META[type])
    .slice(0, 6);

  return (
    <motion.div
      layout
      ref={ref}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      initial={{ opacity: 0, y: 18, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.92 }}
      transition={{
        duration: 0.4,
        delay: Math.min(index * 0.04, 0.3),
        ease: [0.23, 1, 0.32, 1],
      }}
      style={{ rotateX: rx, rotateY: ry, transformStyle: 'preserve-3d', perspective: 1000 }}
    >
      <Link
        to={`/${profile.slug}`}
        className="group relative flex h-full flex-col gap-5 overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 transition-all duration-500 hover:border-white/15 hover:bg-white/[0.035] hover:shadow-[0_25px_70px_rgba(0,0,0,0.45)]"
      >
        <span
          className="pointer-events-none absolute -inset-px rounded-2xl opacity-0 transition-opacity duration-700 group-hover:opacity-50"
          style={{
            background: `radial-gradient(circle at 50% 0%, ${accent}38, transparent 70%)`,
          }}
        />

        {/* Index badge */}
        <span
          className="absolute right-4 top-4 font-mono-tight text-[9px] uppercase tracking-[0.22em] text-white/25"
          style={{ transform: 'translateZ(20px)' }}
        >
          #{String(index + 1).padStart(3, '0')}
        </span>

        <div
          className="flex items-center gap-4"
          style={{ transform: 'translateZ(30px)' }}
        >
          <Avatar url={profile.avatarUrl} name={profile.username} accent={accent} />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1 truncate text-[16px] font-bold tracking-tight">
              <span className="truncate">@{profile.username}</span>
              <ArrowUpRight className="h-4 w-4 flex-none text-white/20 transition-all duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-white" />
            </div>
            <div className="truncate font-mono-tight text-[9px] uppercase tracking-[0.24em] text-white/35">
              persn.me/{profile.slug}
            </div>
          </div>
        </div>

        {profile.bio ? (
          <p
            className="line-clamp-2 h-9 text-xs leading-relaxed text-white/45 transition-colors group-hover:text-white/75"
            style={{ fontFamily: 'Outfit, Inter, sans-serif', transform: 'translateZ(15px)' }}
          >
            {profile.bio}
          </p>
        ) : (
          <div className="h-9" />
        )}

        {displayWidgets.length > 0 && (
          <div
            className="flex flex-wrap gap-1.5"
            style={{ transform: 'translateZ(20px)' }}
          >
            {displayWidgets.slice(0, 4).map((type) => {
              const m = WIDGET_META[type] || WIDGET_META.unknown;
              const Icon = m.icon;
              return (
                <span
                  key={type}
                  className="inline-flex items-center gap-1.5 rounded-md border px-2 py-1 font-mono-tight text-[9px] uppercase tracking-[0.18em] transition-colors"
                  style={{
                    color: m.tint,
                    borderColor: `${m.tint}33`,
                    backgroundColor: `${m.tint}10`,
                  }}
                >
                  <Icon className="h-3 w-3" />
                  {m.label}
                </span>
              );
            })}
            {displayWidgets.length > 4 && (
              <span className="inline-flex items-center rounded-md border border-white/10 bg-white/[0.04] px-2 py-1 font-mono-tight text-[9px] uppercase tracking-[0.18em] text-white/45">
                +{displayWidgets.length - 4}
              </span>
            )}
          </div>
        )}

        <div
          className="mt-auto flex items-center justify-between border-t border-white/[0.04] pt-4"
          style={{ transform: 'translateZ(15px)' }}
        >
          {profile.clickerScore > 0 ? (
            <div className="flex items-center gap-2 font-mono-tight text-[9px] uppercase tracking-[0.22em] text-white/30">
              <MousePointer2 className="h-3 w-3" />
              <span className="tabular-nums">
                {profile.clickerScore.toLocaleString()} clicks
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-2 font-mono-tight text-[9px] uppercase tracking-[0.22em] text-white/15">
              new
            </div>
          )}
          <div
            className="h-1.5 w-1.5 rounded-full"
            style={{ backgroundColor: accent, boxShadow: `0 0 10px ${accent}` }}
          />
        </div>
      </Link>
    </motion.div>
  );
}

const WIDGET_META = {
  badges:          { icon: Award,         label: 'Badges',    tint: '#ffb347' },
  socials:         { icon: Share2,        label: 'Socials',   tint: '#5865F2' },
  discordServers:  { icon: Server,        label: 'Discord',   tint: '#5865F2' },
  discordPresence: { icon: Server,        label: 'Status',    tint: '#5865F2' },
  games:           { icon: Gamepad2,      label: 'Games',     tint: '#ff2e88' },
  clock:           { icon: Clock,         label: 'Clock',     tint: '#c0ff3e' },
  weather:         { icon: Cloud,         label: 'Weather',   tint: '#7dd3fc' },
  nowPlaying:      { icon: Music,         label: 'Music',     tint: '#ff2e88' },
  musicProgress:   { icon: Activity,      label: 'Player',    tint: '#ff2e88' },
  visitorCounter:  { icon: Eye,           label: 'Stats',     tint: '#c0ff3e' },
  twitchStream:    { icon: Tv,            label: 'Twitch',    tint: '#a855f7' },
  guestbook:       { icon: MessageSquare, label: 'Guestbook', tint: '#ffb347' },
  qa:              { icon: HelpCircle,    label: 'Q&A',       tint: '#7dd3fc' },
  clickerGame:     { icon: MousePointer2, label: 'Clicker',   tint: '#c0ff3e' },
  unknown:         { icon: Activity,      label: 'Widget',    tint: '#888888' },
};

function Avatar({ url, name, accent }) {
  const initial = (name || '?').charAt(0).toUpperCase();
  if (url && /^https?:/.test(url)) {
    return (
      <div className="relative flex-none">
        <img
          src={url}
          alt={name}
          className="h-14 w-14 rounded-2xl object-cover ring-1 ring-white/10"
          loading="lazy"
        />
        <div
          className="absolute -inset-1 -z-10 rounded-2xl opacity-25 blur-md transition-opacity group-hover:opacity-45"
          style={{ backgroundColor: accent }}
        />
      </div>
    );
  }
  return (
    <div
      className="flex h-14 w-14 flex-none items-center justify-center rounded-2xl text-xl font-black ring-1 ring-white/10"
      style={{ background: `linear-gradient(135deg, ${accent}, #1a1a1a)`, fontFamily: 'Bebas Neue' }}
    >
      {initial}
    </div>
  );
}
