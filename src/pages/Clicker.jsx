import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Trophy, Compass, Crown } from 'lucide-react';
import { getClickerLeaderboard } from '../utils/api.js';

/**
 * Public clicker leaderboard.
 *
 * Top 3 get a podium — gold/silver/bronze accents and a slightly bigger
 * card. Everyone else lives in a numbered table-ish list below. Refreshes
 * every REFRESH_MS so leaving the tab open keeps the standings up-to-date.
 */
const REFRESH_MS = 30_000;

export default function Clicker() {
  const [entries, setEntries] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const res = await getClickerLeaderboard(50);
      if (cancelled) return;
      setEntries(res.entries || []);
      setTotal(res.total || 0);
      setLoading(false);
    };
    load();
    const id = setInterval(load, REFRESH_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  const podium = entries.slice(0, 3);
  const rest = entries.slice(3);

  return (
    <div className="min-h-screen bg-[#050505] text-white">
      <header className="border-b border-white/5">
        <div className="mx-auto flex max-w-[1100px] items-center justify-between px-6 py-5">
          <Link to="/" className="font-mono text-[11px] uppercase tracking-[0.2em] text-white/50 transition hover:text-white">
            ← persn.me
          </Link>
          <Link
            to="/explore"
            className="flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.18em] text-white/60 transition hover:text-white"
          >
            <Compass className="h-3.5 w-3.5" />
            Explore
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-[1100px] px-6 py-10">
        <div className="mb-10 text-center">
          <div className="mb-2 inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.2em] text-white/40">
            <Trophy className="h-3.5 w-3.5" /> Clicker leaderboard
          </div>
          <h1 className="text-5xl font-black tracking-tight" style={{ fontFamily: 'Bebas Neue' }}>
            Top clickers
          </h1>
          <p className="mt-2 text-sm text-white/50">
            {total.toLocaleString()} profile{total === 1 ? '' : 's'} compete · refreshes every 30s
          </p>
        </div>

        {loading && entries.length === 0 && (
          <p className="rounded-2xl border border-white/5 bg-white/[0.02] p-10 text-center text-sm text-white/40">
            Loading leaderboard…
          </p>
        )}

        {!loading && entries.length === 0 && (
          <p className="rounded-2xl border border-white/5 bg-white/[0.02] p-10 text-center text-sm text-white/40">
            No clicks recorded yet — go pick a profile and start tapping.
          </p>
        )}

        {podium.length > 0 && (
          <div className="mb-10 grid grid-cols-1 gap-4 md:grid-cols-3">
            {podium.map((p, i) => (
              <PodiumCard key={p.slug} entry={p} place={i + 1} />
            ))}
          </div>
        )}

        {rest.length > 0 && (
          <ol className="overflow-hidden rounded-2xl border border-white/5 bg-white/[0.02]">
            {rest.map((p) => (
              <Row key={p.slug} entry={p} />
            ))}
          </ol>
        )}
      </main>
    </div>
  );
}

const PODIUM_STYLES = {
  1: { color: '#ffd24d', label: 'Gold',   crown: true },
  2: { color: '#c9d1d9', label: 'Silver', crown: false },
  3: { color: '#cd7f32', label: 'Bronze', crown: false },
};

function PodiumCard({ entry, place }) {
  const style = PODIUM_STYLES[place];
  return (
    <Link
      to={`/${entry.slug}`}
      className="group relative flex flex-col items-center overflow-hidden rounded-2xl border bg-white/[0.03] p-6 text-center transition hover:-translate-y-0.5"
      style={{ borderColor: `${style.color}40` }}
    >
      <span
        className="pointer-events-none absolute inset-0 opacity-30"
        style={{ background: `radial-gradient(circle at top, ${style.color}30, transparent 60%)` }}
      />
      <div className="relative">
        {style.crown && <Crown className="absolute -top-6 left-1/2 -translate-x-1/2 h-5 w-5" style={{ color: style.color }} />}
        <Avatar url={entry.avatarUrl} name={entry.username} accent={style.color} size={72} />
      </div>
      <div
        className="relative mt-3 font-mono text-[10px] uppercase tracking-[0.2em]"
        style={{ color: style.color }}
      >
        #{place} · {style.label}
      </div>
      <div className="relative mt-1 truncate text-base font-semibold">@{entry.username}</div>
      <div className="relative mt-1 text-2xl font-black tabular-nums" style={{ fontFamily: 'Bebas Neue' }}>
        {entry.score.toLocaleString()}
      </div>
      <div className="relative mt-0.5 font-mono text-[10px] uppercase tracking-[0.18em] text-white/40">
        clicks
      </div>
    </Link>
  );
}

function Row({ entry }) {
  return (
    <li>
      <Link
        to={`/${entry.slug}`}
        className="flex items-center gap-4 border-b border-white/5 px-5 py-3 transition last:border-b-0 hover:bg-white/[0.03]"
      >
        <span className="w-8 flex-none font-mono text-xs tabular-nums text-white/40">
          #{entry.rank}
        </span>
        <Avatar url={entry.avatarUrl} name={entry.username} size={36} />
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold">@{entry.username}</div>
          <div className="truncate font-mono text-[10px] uppercase tracking-[0.18em] text-white/40">
            persn.me/{entry.slug}
          </div>
        </div>
        <div className="text-right">
          <div className="text-base font-bold tabular-nums">{entry.score.toLocaleString()}</div>
          <div className="font-mono text-[9px] uppercase tracking-[0.18em] text-white/40">clicks</div>
        </div>
      </Link>
    </li>
  );
}

function Avatar({ url, name, accent = '#5865F2', size = 40 }) {
  const initial = (name || '?').charAt(0).toUpperCase();
  const style = {
    width: size,
    height: size,
    boxShadow: `0 0 0 2px ${accent}33`,
  };
  if (url && /^https?:/.test(url)) {
    return (
      <img
        src={url}
        alt={name}
        className="flex-none rounded-full object-cover"
        style={style}
        loading="lazy"
      />
    );
  }
  return (
    <div
      className="flex flex-none items-center justify-center rounded-full font-black"
      style={{
        ...style,
        background: `linear-gradient(135deg, ${accent}, #1a1a1a)`,
        fontSize: size * 0.42,
      }}
    >
      {initial}
    </div>
  );
}
