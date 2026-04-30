import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, Compass, Clock, Trophy } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { getExploreFeed } from '../utils/api.js';

/**
 * Public profile directory.
 *
 *   - Recent vs Most-clicked toggle
 *   - "Load more" pagination
 *   - Each card links to the profile's vanity URL
 */
export default function Explore() {
  const [sort, setSort] = useState('recent');
  const [entries, setEntries] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  // Reset feed when sort changes.
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

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#050505] text-white">
      <AnimatedBackground />

      <header className="relative z-10 border-b border-white/5 backdrop-blur-sm">
        <div className="mx-auto flex max-w-[1200px] items-center justify-between px-6 py-5">
          <Link to="/" className="font-mono text-[11px] uppercase tracking-[0.2em] text-white/50 transition hover:text-white">
            ← persn.me
          </Link>
          <Link
            to="/clicker"
            className="flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.18em] text-white/60 transition hover:text-white"
          >
            <Trophy className="h-3.5 w-3.5" />
            Leaderboard
          </Link>
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-[1200px] px-6 py-12">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className="mb-12 flex flex-col items-start justify-between gap-6 md:flex-row md:items-end"
        >
          <div>
            <div className="mb-3 flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.25em] text-[#5865F2]/80">
              <Compass className="h-3.5 w-3.5" /> Explore profiles
            </div>
            <h1 className="text-5xl font-black tracking-tight md:text-6xl" style={{ fontFamily: 'Bebas Neue' }}>
              Discover <span className="text-gradient">the community</span>
            </h1>
            <p className="mt-3 max-w-md text-sm leading-relaxed text-white/50">
              Join {total.toLocaleString()} profile{total === 1 ? '' : 's'} building their digital identity on persn.me. Find inspiration for your next design.
            </p>
          </div>

          <div className="flex items-center rounded-full border border-white/10 bg-white/[0.03] p-1.5 backdrop-blur-md">
            <SortPill active={sort === 'recent'} onClick={() => setSort('recent')} icon={Clock}>
              Recent
            </SortPill>
            <SortPill active={sort === 'clicker'} onClick={() => setSort('clicker')} icon={Trophy}>
              Most clicked
            </SortPill>
          </div>
        </motion.div>

        {entries.length === 0 && !loading && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="rounded-3xl border border-white/5 bg-white/[0.01] p-16 text-center backdrop-blur-sm"
          >
            <p className="text-sm text-white/30 font-mono uppercase tracking-widest">
              No profiles to show yet — be the first.
            </p>
          </motion.div>
        )}

        <motion.div 
          layout
          className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
        >
          <AnimatePresence mode="popLayout">
            {entries.map((p, i) => (
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
              className="group relative overflow-hidden rounded-full border border-white/10 bg-white/[0.04] px-8 py-3 font-mono text-[11px] uppercase tracking-[0.2em] text-white/70 transition-all hover:border-white/40 hover:text-white disabled:opacity-50"
            >
              <span className="relative z-10">{loading ? 'Syncing…' : 'Load more profiles'}</span>
              <span className="absolute inset-0 z-0 bg-white/5 opacity-0 transition-opacity group-hover:opacity-100" />
            </button>
          </div>
        )}
      </main>

      <style>{`
        .text-gradient {
          background: linear-gradient(to right, #ffffff, #5865F2);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }
      `}</style>
    </div>
  );
}

function AnimatedBackground() {
  return (
    <div className="fixed inset-0 z-0">
      <motion.div
        animate={{
          scale: [1, 1.2, 1],
          opacity: [0.3, 0.5, 0.3],
          x: [0, 100, 0],
          y: [0, 50, 0],
        }}
        transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
        className="absolute -left-[10%] -top-[10%] h-[60%] w-[60%] rounded-full bg-[#5865F2]/10 blur-[120px]"
      />
      <motion.div
        animate={{
          scale: [1.2, 1, 1.2],
          opacity: [0.2, 0.4, 0.2],
          x: [0, -100, 0],
          y: [0, -50, 0],
        }}
        transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
        className="absolute -right-[10%] -bottom-[10%] h-[60%] w-[60%] rounded-full bg-purple-500/5 blur-[120px]"
      />
      <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.03] brightness-100 contrast-150" />
    </div>
  );
}

function SortPill({ active, onClick, icon: Icon, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'relative flex items-center gap-1.5 rounded-full px-5 py-2 font-mono text-[10px] uppercase tracking-[0.2em] transition-all duration-300',
        active ? 'text-black' : 'text-white/50 hover:text-white',
      ].join(' ')}
    >
      {active && (
        <motion.div
          layoutId="active-pill"
          className="absolute inset-0 rounded-full bg-white shadow-xl shadow-white/10"
          transition={{ type: 'spring', bounce: 0.25, duration: 0.5 }}
        />
      )}
      <Icon className="relative z-10 h-3 w-3" />
      <span className="relative z-10">{children}</span>
    </button>
  );
}

function ProfileCard({ profile, index }) {
  const accent = profile.accent || '#5865F2';
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ 
        duration: 0.4, 
        delay: Math.min(index * 0.05, 0.5),
        ease: [0.23, 1, 0.32, 1]
      }}
    >
      <Link
        to={`/${profile.slug}`}
        className="group relative flex flex-col gap-4 overflow-hidden rounded-3xl border border-white/5 bg-white/[0.02] p-6 transition-all duration-500 hover:border-white/10 hover:bg-white/[0.04]"
      >
        <span
          className="pointer-events-none absolute -inset-px rounded-3xl opacity-0 transition-opacity duration-700 group-hover:opacity-40"
          style={{ background: `radial-gradient(circle at 50% 0%, ${accent}33, transparent 70%)` }}
        />

        <div className="flex items-center gap-4">
          <Avatar url={profile.avatarUrl} name={profile.username} accent={accent} />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1 truncate text-[15px] font-bold tracking-tight">
              <span className="truncate">@{profile.username}</span>
              <ArrowUpRight className="h-4 w-4 flex-none text-white/20 transition-all duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-white" />
            </div>
            <div className="truncate font-mono text-[9px] uppercase tracking-[0.25em] text-white/30">
              persn.me/{profile.slug}
            </div>
          </div>
        </div>

        {profile.bio && (
          <p className="line-clamp-2 text-xs leading-relaxed text-white/50 group-hover:text-white/70 transition-colors">
            {profile.bio}
          </p>
        )}

        {profile.clickerScore > 0 && (
          <div className="mt-auto flex items-center gap-2 font-mono text-[9px] uppercase tracking-[0.2em] text-white/30">
            <div className="h-1 w-1 rounded-full bg-[#5865F2]" />
            {profile.clickerScore.toLocaleString()} clicks recorded
          </div>
        )}
      </Link>
    </motion.div>
  );
}

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
          className="absolute -inset-1 -z-10 rounded-2xl blur-md opacity-20 transition-opacity group-hover:opacity-40" 
          style={{ backgroundColor: accent }}
        />
      </div>
    );
  }
  return (
    <div
      className="flex h-14 w-14 flex-none items-center justify-center rounded-2xl text-xl font-black ring-1 ring-white/10"
      style={{
        background: `linear-gradient(135deg, ${accent}, #1a1a1a)`,
      }}
    >
      {initial}
    </div>
  );
}
