import { useEffect, useRef, useState } from 'react';
import { getClickerScore, postClickerBatch } from '../../utils/api.js';

/**
 * Cookie-clicker-style global counter, shared by every visitor of the same
 * profile. Score lives in `Profile.clickerScore` server-side.
 *
 * Behaviour:
 *  - Public view (slug prop set): hydrate from server, on click bump
 *    optimistically, batch-flush every BATCH_FLUSH_MS or once we hit
 *    BATCH_MAX clicks. Below the button we show "Vous êtes #X sur Y".
 *  - Editor preview (no slug): purely visual stub. Click count resets on
 *    refresh; no network calls.
 */
const BATCH_FLUSH_MS = 800;
const BATCH_MAX = 50; // matches the server's MAX_CLICKS_PER_REQ
const RANK_REFRESH_MS = 5_000;

export default function ClickerGameWidget({ widget, accent, slug }) {
  const data = widget.data || {};
  const emoji = data.emoji || '🍪';
  const label = data.label || 'Click me!';
  const increment = 1;
  const target = clamp(parseInt(data.target, 10) || 0, 0, 1_000_000_000);
  const accentColor = typeof accent === 'string' ? accent : '#5865F2';
  const isLive = !!slug;

  const [score, setScore] = useState(0);
  const [rank, setRank] = useState(null);
  const [total, setTotal] = useState(0);
  const [pops, setPops] = useState([]);
  const [pressed, setPressed] = useState(false);

  const popIdRef = useRef(0);
  const pressTimer = useRef(null);
  const pendingRef = useRef(0);     // clicks not yet sent to server
  const flushTimer = useRef(null);
  const isFlushingRef = useRef(false);

  // Hydrate from server (live mode only).
  useEffect(() => {
    if (!isLive) return;
    let cancelled = false;
    (async () => {
      const res = await getClickerScore(slug);
      if (cancelled) return;
      setScore(res.score ?? 0);
      setRank(res.rank ?? null);
      setTotal(res.total ?? 0);
    })();
    return () => {
      cancelled = true;
    };
  }, [isLive, slug]);

  // Periodic rank refresh — keeps the leaderboard line fresh while the user
  // is just looking at someone else's profile without clicking.
  useEffect(() => {
    if (!isLive) return;
    const id = setInterval(async () => {
      const res = await getClickerScore(slug);
      // Only adopt the server score when it's higher than what we have
      // locally pending — otherwise we'd snap backwards while a flush is
      // mid-flight.
      setScore((prev) => Math.max(prev, res.score ?? 0));
      setRank(res.rank ?? null);
      setTotal(res.total ?? 0);
    }, RANK_REFRESH_MS);
    return () => clearInterval(id);
  }, [isLive, slug]);

  // Ensure we flush any pending clicks if the user navigates away or hides the tab.
  useEffect(() => {
    if (!isLive) return;
    const handleVisibility = () => {
      if (document.visibilityState === 'hidden') {
        flushBatch();
      }
    };
    window.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('pagehide', flushBatch);
    return () => {
      window.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('pagehide', flushBatch);
      clearTimeout(pressTimer.current);
      clearTimeout(flushTimer.current);
      // Final flush attempt on component unmount
      flushBatch();
    };
  }, [isLive, slug]);

  const flushBatch = async () => {
    if (isFlushingRef.current || !isLive) return;
    const count = pendingRef.current;
    if (!count) return;

    isFlushingRef.current = true;
    pendingRef.current = 0;

    const res = await postClickerBatch(slug, count);

    if (res) {
      // Trust the server's view to reconcile any drift, but keep the user's
      // optimistic count if it's still ahead (more clicks happened during
      // the round-trip).
      setScore((prev) => Math.max(prev, res.score ?? 0));
      setRank(res.rank ?? null);
      setTotal(res.total ?? 0);
    } else {
      // API failed — restore the clicks so they get picked up by the next flush.
      pendingRef.current += count;
    }

    isFlushingRef.current = false;

    // If more clicks happened while we were talking to the server, schedule
    // another flush.
    if (pendingRef.current > 0) {
      scheduleFlush();
    }
  };

  const scheduleFlush = () => {
    clearTimeout(flushTimer.current);
    if (isFlushingRef.current) return;

    if (pendingRef.current >= BATCH_MAX) {
      flushBatch();
      return;
    }
    flushTimer.current = setTimeout(flushBatch, BATCH_FLUSH_MS);
  };

  const onClick = () => {
    setScore((prev) => prev + increment);
    if (isLive) {
      pendingRef.current += increment;
      scheduleFlush();
    }

    const id = ++popIdRef.current;
    setPops((p) => [...p, { id, value: increment }]);
    setTimeout(() => setPops((p) => p.filter((x) => x.id !== id)), 800);

    setPressed(true);
    clearTimeout(pressTimer.current);
    pressTimer.current = setTimeout(() => setPressed(false), 120);
  };

  const reached = target > 0 && score >= target;
  const progress = target > 0 ? Math.min(1, score / target) : 0;
  const rankLine = isLive
    ? rank
      ? `Ce profil est #${rank.toLocaleString()} sur ${total.toLocaleString()}`
      : 'Premier clic = entrée au classement'
    : 'Aperçu — les clics comptent en ligne';

  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-2 px-3 py-3">
      <div className="flex flex-col items-center">
        <div className="eyebrow" style={{ color: 'currentColor' }}>
          {label}
        </div>
        <div
          className="mt-0.5 text-2xl font-semibold tabular-nums tracking-tight"
          style={{ color: 'currentColor' }}
        >
          {score.toLocaleString()}
        </div>
      </div>

      <button
        type="button"
        onClick={onClick}
        onPointerDown={(e) => e.stopPropagation()}
        aria-label={label}
        className={[
          'relative flex h-16 w-16 items-center justify-center rounded-full text-3xl select-none',
          'border border-white/10 bg-white/[0.04] backdrop-blur',
          'transition-transform duration-100 ease-out hover:scale-105 active:scale-95',
          pressed ? 'scale-95' : '',
        ].join(' ')}
        style={{ boxShadow: `0 0 24px -8px ${accentColor}` }}
      >
        <span className="pointer-events-none drop-shadow">{emoji}</span>

        {pops.map((p) => (
          <span
            key={p.id}
            className="pointer-events-none absolute -top-1 left-1/2 -translate-x-1/2 text-[11px] font-semibold tabular-nums"
            style={{ color: accentColor, animation: 'persnClickPop 800ms ease-out forwards' }}
          >
            +{p.value.toLocaleString()}
          </span>
        ))}
      </button>

      {target > 0 && (
        <div className="w-full max-w-[170px] space-y-1">
          <div className="h-1 w-full overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{ width: `${progress * 100}%`, backgroundColor: accentColor }}
            />
          </div>
          <div className="text-center text-[10px] tabular-nums opacity-60">
            {reached ? '🎉 goal reached' : `${score.toLocaleString()} / ${target.toLocaleString()}`}
          </div>
        </div>
      )}

      <div className="text-center text-[10px] opacity-70" style={{ color: accentColor }}>
        {rankLine}
      </div>

      <style>{`
        @keyframes persnClickPop {
          0%   { transform: translate(-50%, 0)   scale(0.8); opacity: 0; }
          15%  { transform: translate(-50%, -4px) scale(1);   opacity: 1; }
          100% { transform: translate(-50%, -28px) scale(1);  opacity: 0; }
        }
      `}</style>
    </div>
  );
}

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}
