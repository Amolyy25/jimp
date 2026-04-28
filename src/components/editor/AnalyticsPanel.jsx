import { useEffect, useState } from 'react';
import { History as HistoryIcon, Loader2 } from 'lucide-react';
import { getMyAnalytics } from '../../utils/api.js';

/**
 * Analytics tab in the editor sidebar.
 *
 * - Sparkline of views/day (SVG, no chart lib)
 * - Total views, top referrers, top clicks
 * - "View history" button surfaces the version timeline (Feature 13)
 *
 * The endpoint is authenticated and scoped to the caller's profile, so we
 * just hide the panel content if there's no claimed slug yet.
 */
export default function AnalyticsPanel({ slug, onOpenHistory }) {
  const [days, setDays] = useState(7);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!slug) {
      setLoading(false);
      return;
    }
    setLoading(true);
    getMyAnalytics(days).then((d) => {
      setData(d);
      setLoading(false);
    });
  }, [slug, days]);

  if (!slug) {
    return (
      <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-5 text-center">
        <p className="text-xs text-white/50">
          Claim your custom URL first to start collecting analytics.
        </p>
      </div>
    );
  }

  if (loading || !data) {
    return (
      <div className="flex items-center justify-center py-12 text-white/30">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="eyebrow">Window</span>
        <div className="flex rounded-full border border-white/10 bg-black/30 p-0.5 text-[10px] font-bold uppercase tracking-widest">
          {[7, 30, 90].map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => setDays(d)}
              className={[
                'rounded-full px-2.5 py-1 transition',
                days === d ? 'bg-discord text-white' : 'text-white/40',
              ].join(' ')}
            >
              {d}d
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Stat label="Views" value={data.views.total} />
        <Stat label="Clicks" value={data.clicks.total} />
      </div>

      <Sparkline points={data.views.perDay} />

      <Section title="Top referrers">
        {data.views.topReferrers.length === 0 ? (
          <p className="text-[11px] text-white/40">No referrer data yet.</p>
        ) : (
          <ul className="space-y-1">
            {data.views.topReferrers.map((r) => (
              <RowBar key={r.host} label={r.host} value={r.count} max={data.views.topReferrers[0].count} />
            ))}
          </ul>
        )}
      </Section>

      <Section title="Top clicks">
        {data.clicks.byTarget.length === 0 ? (
          <p className="text-[11px] text-white/40">No clicks tracked yet.</p>
        ) : (
          <ul className="space-y-1">
            {data.clicks.byTarget.slice(0, 8).map((c, i) => (
              <RowBar
                key={`${c.target}-${i}`}
                label={prettifyTarget(c.target)}
                hint={c.kind}
                value={c.count}
                max={data.clicks.byTarget[0].count}
              />
            ))}
          </ul>
        )}
      </Section>

      <button
        type="button"
        onClick={onOpenHistory}
        className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-[11px] font-semibold text-white/70 transition hover:bg-white/10 hover:text-white"
      >
        <HistoryIcon className="h-3.5 w-3.5" />
        Profile history
      </button>
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3">
      <div className="text-2xl font-bold tabular-nums">{value}</div>
      <div className="text-[10px] uppercase tracking-widest text-white/40">{label}</div>
    </div>
  );
}

function Sparkline({ points }) {
  if (!points?.length) return null;
  const max = Math.max(1, ...points.map((p) => p.count));
  const w = 280;
  const h = 60;
  const stepX = points.length > 1 ? w / (points.length - 1) : 0;
  const path = points
    .map((p, i) => {
      const x = i * stepX;
      const y = h - (p.count / max) * h;
      return `${i === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(' ');
  return (
    <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3">
      <div className="mb-1.5 flex items-baseline justify-between">
        <span className="eyebrow">Views per day</span>
        <span className="text-[10px] text-white/40">peak {max}</span>
      </div>
      <svg width="100%" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className="overflow-visible">
        <path d={path} fill="none" stroke="#5865F2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        {points.map((p, i) => {
          const x = i * stepX;
          const y = h - (p.count / max) * h;
          return <circle key={p.day} cx={x} cy={y} r="2" fill="#5865F2" />;
        })}
      </svg>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div>
      <div className="eyebrow mb-2">{title}</div>
      {children}
    </div>
  );
}

function RowBar({ label, hint, value, max }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <li className="rounded-lg bg-white/[0.02] px-3 py-2">
      <div className="mb-1 flex items-baseline justify-between gap-2">
        <span className="truncate text-[11px] font-semibold">{label}</span>
        <span className="text-[10px] tabular-nums text-white/50">{value}</span>
      </div>
      <div className="h-1 overflow-hidden rounded-full bg-white/10">
        <span className="block h-full rounded-full bg-discord" style={{ width: `${pct}%` }} />
      </div>
      {hint && <div className="mt-0.5 text-[9px] uppercase tracking-widest text-white/30">{hint}</div>}
    </li>
  );
}

function prettifyTarget(t) {
  try {
    const u = new URL(t);
    return `${u.host}${u.pathname.length > 1 ? u.pathname : ''}`;
  } catch {
    return t;
  }
}
