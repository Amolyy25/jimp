import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, Compass, Clock, Trophy } from 'lucide-react';
import { getExploreFeed } from '../utils/api.js';

/**
 * Public profile directory.
 *
 *   - Recent vs Most-clicked toggle
 *   - "Load more" pagination (no infinite scroll, easier to debug + a11y)
 *   - Each card links to the profile's vanity URL
 *
 * The card uses the profile's accent colour for the border glow so the page
 * feels alive even when avatars are missing.
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
    <div className="min-h-screen bg-[#050505] text-white">
      <header className="border-b border-white/5">
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

      <main className="mx-auto max-w-[1200px] px-6 py-10">
        <div className="mb-8 flex items-end justify-between gap-4">
          <div>
            <div className="mb-2 flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.2em] text-white/40">
              <Compass className="h-3.5 w-3.5" /> Explore
            </div>
            <h1 className="text-4xl font-black tracking-tight" style={{ fontFamily: 'Bebas Neue' }}>
              Discover profiles
            </h1>
            <p className="mt-1 text-sm text-white/50">
              {total.toLocaleString()} profile{total === 1 ? '' : 's'} on persn.me.
            </p>
          </div>

          <div className="flex items-center rounded-full border border-white/10 bg-white/[0.03] p-1">
            <SortPill active={sort === 'recent'} onClick={() => setSort('recent')} icon={Clock}>
              Recent
            </SortPill>
            <SortPill active={sort === 'clicker'} onClick={() => setSort('clicker')} icon={Trophy}>
              Most clicked
            </SortPill>
          </div>
        </div>

        {entries.length === 0 && !loading && (
          <p className="rounded-2xl border border-white/5 bg-white/[0.02] p-10 text-center text-sm text-white/40">
            No profiles to show yet — be the first.
          </p>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {entries.map((p) => (
            <ProfileCard key={p.slug} profile={p} />
          ))}
        </div>

        {hasMore && (
          <div className="mt-10 flex justify-center">
            <button
              type="button"
              onClick={loadMore}
              disabled={loading}
              className="rounded-full border border-white/10 bg-white/[0.04] px-5 py-2 font-mono text-[11px] uppercase tracking-[0.18em] text-white/70 transition hover:border-white/30 hover:text-white disabled:opacity-50"
            >
              {loading ? 'Loading…' : 'Load more'}
            </button>
          </div>
        )}
      </main>
    </div>
  );
}

function SortPill({ active, onClick, icon: Icon, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'flex items-center gap-1.5 rounded-full px-3.5 py-1.5 font-mono text-[10px] uppercase tracking-[0.18em] transition',
        active ? 'bg-white text-black' : 'text-white/60 hover:text-white',
      ].join(' ')}
    >
      <Icon className="h-3 w-3" />
      {children}
    </button>
  );
}

function ProfileCard({ profile }) {
  const accent = profile.accent || '#5865F2';
  return (
    <Link
      to={`/${profile.slug}`}
      className="group relative flex flex-col gap-3 overflow-hidden rounded-2xl border border-white/5 bg-white/[0.02] p-5 transition hover:-translate-y-0.5 hover:border-white/15"
      style={{ ['--accent']: accent }}
    >
      {/* accent halo on hover */}
      <span
        className="pointer-events-none absolute -inset-px rounded-2xl opacity-0 transition-opacity duration-500 group-hover:opacity-30"
        style={{ background: `radial-gradient(circle at top, ${accent}, transparent 70%)` }}
      />

      <div className="flex items-center gap-3">
        <Avatar url={profile.avatarUrl} name={profile.username} accent={accent} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1 truncate text-sm font-semibold">
            <span className="truncate">@{profile.username}</span>
            <ArrowUpRight className="h-3.5 w-3.5 flex-none text-white/30 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-white" />
          </div>
          <div className="truncate font-mono text-[10px] uppercase tracking-[0.18em] text-white/40">
            persn.me/{profile.slug}
          </div>
        </div>
      </div>

      {profile.bio && (
        <p className="line-clamp-2 text-xs leading-relaxed text-white/60">{profile.bio}</p>
      )}

      {profile.clickerScore > 0 && (
        <div className="mt-auto flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-white/40">
          <Trophy className="h-3 w-3" />
          {profile.clickerScore.toLocaleString()} clicks
        </div>
      )}
    </Link>
  );
}

function Avatar({ url, name, accent }) {
  const initial = (name || '?').charAt(0).toUpperCase();
  if (url && /^https?:/.test(url)) {
    return (
      <img
        src={url}
        alt={name}
        className="h-12 w-12 flex-none rounded-full object-cover"
        style={{ boxShadow: `0 0 0 2px ${accent}33` }}
        loading="lazy"
      />
    );
  }
  return (
    <div
      className="flex h-12 w-12 flex-none items-center justify-center rounded-full text-base font-black"
      style={{
        background: `linear-gradient(135deg, ${accent}, #1a1a1a)`,
        boxShadow: `0 0 0 2px ${accent}33`,
      }}
    >
      {initial}
    </div>
  );
}
