import { useEffect, useState } from 'react';

/**
 * Purely cosmetic visitor counter.
 * We keep the count in localStorage (keyed per profile) and bump it once on
 * mount. This is client-side only — it only tracks the viewer's own visits
 * on their own device. It's here for the aesthetic, not for real analytics.
 */
export default function VisitorCounterWidget({ widget }) {
  const key = `jimp:visits:${widget.data.storageKey || 'default'}`;
  const [count, setCount] = useState(() => readCount(key));

  useEffect(() => {
    const next = readCount(key) + 1;
    try {
      window.localStorage.setItem(key, String(next));
    } catch {
      /* ignore */
    }
    setCount(next);
  }, [key]);

  return (
    <div className="flex h-full w-full items-center justify-center px-3">
      <div className="text-center">
        <div className="eyebrow" style={{ color: 'currentColor' }}>
          Visitors
        </div>
        <div
          className="mt-0.5 text-base font-semibold tabular-nums tracking-tight"
          style={{ color: 'currentColor' }}
        >
          {count.toLocaleString()}
        </div>
      </div>
    </div>
  );
}

function readCount(key) {
  try {
    const raw = window.localStorage.getItem(key);
    const n = raw == null ? 0 : parseInt(raw, 10);
    return Number.isFinite(n) ? n : 0;
  } catch {
    return 0;
  }
}
