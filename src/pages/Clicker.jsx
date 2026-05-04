import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Trophy, Compass, Crown, MousePointer2 } from 'lucide-react';
import { motion, useMotionValue } from 'framer-motion';
import { getClickerLeaderboard } from '../utils/api.js';

const REFRESH_MS = 30_000;

const PODIUM_STYLES = {
  1: { color: '#ffd24d', label: 'Gold', crown: true, scale: 1.05 },
  2: { color: '#c9d1d9', label: 'Silver', crown: false, scale: 1 },
  3: { color: '#cd7f32', label: 'Bronze', crown: false, scale: 0.96 },
};

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
    <div className="relative min-h-screen overflow-hidden bg-[#050505] text-white antialiased">
      <Backdrop />

      <header className="relative z-10 border-b border-white/[0.06] bg-black/40 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1200px] items-center justify-between px-6 py-4">
          <Link
            to="/"
            className="font-mono-tight text-[10px] uppercase tracking-[0.22em] text-white/55 transition hover:text-white"
          >
            ← persn.me
          </Link>
          <Link
            to="/explore"
            className="flex items-center gap-1.5 font-mono-tight text-[10px] uppercase tracking-[0.22em] text-white/65 transition hover:text-white"
          >
            <Compass className="h-3.5 w-3.5" />
            Explore
          </Link>
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-[1200px] px-6 py-14 md:py-20">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="mb-12 text-center"
        >
          <div className="mb-4 inline-flex items-center gap-1.5 font-mono-tight text-[10px] uppercase tracking-[0.24em] text-white/45">
            <Trophy className="h-3 w-3 text-[#ffd24d]" />
            Clicker leaderboard
          </div>
          <h1
            className="text-[14vw] font-black leading-[0.86] tracking-[-0.02em] md:text-[7rem]"
            style={{ fontFamily: 'Bebas Neue' }}
          >
            <span className="bg-gradient-to-br from-[#ffd24d] via-white to-[#cd7f32] bg-clip-text text-transparent">
              TOP
            </span>{' '}
            <span style={{ fontFamily: 'Playfair Display' }} className="italic font-medium text-white/60">
              clickers.
            </span>
          </h1>
          <p
            className="mx-auto mt-3 max-w-md text-sm text-white/50"
            style={{ fontFamily: 'Outfit, Inter, sans-serif' }}
          >
            <span className="tabular-nums">{total.toLocaleString()}</span> profile{total === 1 ? '' : 's'} compete · live refresh every 30s
          </p>
        </motion.div>

        {loading && entries.length === 0 && (
          <div className="grid gap-4 md:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="h-72 animate-pulse rounded-2xl border border-white/[0.06] bg-white/[0.015]"
              />
            ))}
          </div>
        )}

        {!loading && entries.length === 0 && (
          <div className="rounded-2xl border border-dashed border-white/[0.08] bg-white/[0.01] p-16 text-center">
            <p className="font-mono-tight text-[11px] uppercase tracking-[0.24em] text-white/30">
              no clicks recorded yet — go pick a profile and start tapping
            </p>
          </div>
        )}

        {podium.length > 0 && (
          <div className="mb-12 grid grid-cols-1 gap-4 md:grid-cols-3 md:items-end">
            {[1, 0, 2].map((idx) => {
              const p = podium[idx];
              if (!p) return <div key={idx} />;
              return <PodiumCard key={p.slug} entry={p} place={idx + 1} />;
            })}
          </div>
        )}

        {rest.length > 0 && (
          <div className="overflow-hidden rounded-2xl border border-white/[0.06]">
            <div className="grid grid-cols-[60px_1fr_120px] gap-4 border-b border-white/[0.06] bg-white/[0.025] px-5 py-3 font-mono-tight text-[10px] uppercase tracking-[0.22em] text-white/40">
              <span>#</span>
              <span>Player</span>
              <span className="text-right">Clicks</span>
            </div>
            <ol>
              {rest.map((p, i) => (
                <Row key={p.slug} entry={p} index={i} />
              ))}
            </ol>
          </div>
        )}
      </main>

      <style>{`
        .font-mono-tight { font-family: 'JetBrains Mono', monospace; }
      `}</style>
    </div>
  );
}

function Backdrop() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-0">
      <motion.div
        animate={{ scale: [1, 1.18, 1], opacity: [0.2, 0.32, 0.2] }}
        transition={{ duration: 22, repeat: Infinity, ease: 'linear' }}
        className="absolute -top-40 left-1/2 h-[600px] w-[800px] -translate-x-1/2 rounded-full bg-[#ffd24d]/8 blur-[140px]"
      />
      <motion.div
        animate={{ scale: [1.15, 1, 1.15], opacity: [0.08, 0.18, 0.08] }}
        transition={{ duration: 26, repeat: Infinity, ease: 'linear' }}
        className="absolute bottom-[-10%] right-[-10%] h-[500px] w-[500px] rounded-full bg-[#5865F2]/[0.07] blur-[140px]"
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

function PodiumCard({ entry, place }) {
  const style = PODIUM_STYLES[place];
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

  return (
    <motion.div
      ref={ref}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      style={{
        rotateX: rx,
        rotateY: ry,
        transformStyle: 'preserve-3d',
        perspective: 1000,
      }}
      whileHover={{ y: -4 }}
      transition={{ type: 'spring', stiffness: 300, damping: 22 }}
    >
      <Link
        to={`/${entry.slug}`}
        style={{ scale: style.scale }}
        className="group relative flex flex-col items-center overflow-hidden rounded-2xl border bg-white/[0.025] p-7 text-center backdrop-blur"
      >
        <span
          className="pointer-events-none absolute inset-0 opacity-30"
          style={{
            background: `radial-gradient(circle at top, ${style.color}40, transparent 65%)`,
            borderColor: `${style.color}40`,
          }}
        />
        <div
          className="absolute inset-0 rounded-2xl border"
          style={{ borderColor: `${style.color}33` }}
        />

        <span
          className="absolute left-4 top-4 font-mono-tight text-[10px] uppercase tracking-[0.22em]"
          style={{ color: style.color }}
        >
          #{place}
        </span>
        <span
          className="absolute right-4 top-4 font-mono-tight text-[10px] uppercase tracking-[0.22em] text-white/30"
        >
          {style.label}
        </span>

        <div className="relative mt-3" style={{ transform: 'translateZ(40px)' }}>
          {style.crown && (
            <Crown
              className="absolute -top-7 left-1/2 h-6 w-6 -translate-x-1/2"
              style={{ color: style.color, filter: `drop-shadow(0 0 12px ${style.color}80)` }}
            />
          )}
          <Avatar url={entry.avatarUrl} name={entry.username} accent={style.color} size={88} />
        </div>

        <div
          className="relative mt-4 truncate text-base font-semibold"
          style={{ transform: 'translateZ(20px)' }}
        >
          @{entry.username}
        </div>
        <div
          className="relative mt-1 text-5xl font-black tabular-nums"
          style={{ fontFamily: 'Bebas Neue', transform: 'translateZ(60px)' }}
        >
          {entry.score.toLocaleString()}
        </div>
        <div
          className="relative mt-1 flex items-center gap-1.5 font-mono-tight text-[9px] uppercase tracking-[0.22em] text-white/40"
          style={{ transform: 'translateZ(15px)' }}
        >
          <MousePointer2 className="h-3 w-3" />
          clicks
        </div>
      </Link>
    </motion.div>
  );
}

function Row({ entry, index }) {
  return (
    <li>
      <Link
        to={`/${entry.slug}`}
        className="group grid grid-cols-[60px_1fr_120px] items-center gap-4 border-b border-white/[0.04] px-5 py-3 transition last:border-b-0 hover:bg-white/[0.025]"
      >
        <span className="font-mono-tight text-xs tabular-nums text-white/40">
          #{entry.rank}
        </span>
        <div className="flex min-w-0 items-center gap-3">
          <Avatar url={entry.avatarUrl} name={entry.username} size={36} />
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold transition-colors group-hover:text-white">
              @{entry.username}
            </div>
            <div className="truncate font-mono-tight text-[9px] uppercase tracking-[0.22em] text-white/35">
              persn.me/{entry.slug}
            </div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-base font-bold tabular-nums">
            {entry.score.toLocaleString()}
          </div>
          <div className="font-mono-tight text-[9px] uppercase tracking-[0.22em] text-white/35">
            clicks
          </div>
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
    boxShadow: `0 0 0 2px ${accent}33, 0 0 24px ${accent}22`,
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
        fontFamily: 'Bebas Neue',
      }}
    >
      {initial}
    </div>
  );
}
