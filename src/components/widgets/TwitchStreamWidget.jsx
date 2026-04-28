import { useEffect, useState } from 'react';

/**
 * Twitch stream-status widget.
 *
 * Polls /api/twitch/status/:channel every 60s. When the channel is live we
 * render a real player iframe (player.twitch.tv) plus a pulsing red LIVE
 * pill; when offline we render the channel's avatar with an "offline" tag.
 *
 * `parent` for the player iframe is detected from `window.location.host`
 * — Twitch requires this to match the host the iframe is embedded in.
 * We append the bare host plus the most common dev hosts so it works in
 * both production and a local Vite dev server.
 */
export default function TwitchStreamWidget({ widget, accent }) {
  const channel = (widget.data.channel || '').trim();
  const [status, setStatus] = useState(null);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    if (!channel) return;
    let cancelled = false;
    const fetchStatus = async () => {
      try {
        const r = await fetch(`/api/twitch/status/${encodeURIComponent(channel)}`);
        if (!r.ok) throw new Error(`status ${r.status}`);
        const data = await r.json();
        if (!cancelled) {
          setStatus(data);
          setNow(Date.now());
        }
      } catch {
        if (!cancelled) setStatus({ live: false, error: 'fetch' });
      }
    };
    fetchStatus();
    const id = setInterval(fetchStatus, 60_000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [channel]);

  if (!channel) {
    return (
      <div className="flex h-full items-center justify-center px-4 text-xs opacity-50">
        Add a Twitch channel in the editor
      </div>
    );
  }

  if (!status) {
    return (
      <div className="flex h-full items-center justify-center px-4 text-xs opacity-40">
        Loading…
      </div>
    );
  }

  const accentColor = accent || '#9146FF';

  if (status.live) {
    const parents = parents_();
    const parentParam = parents.map((p) => `parent=${encodeURIComponent(p)}`).join('&');
    const src = `https://player.twitch.tv/?channel=${encodeURIComponent(channel)}&muted=true&autoplay=true&${parentParam}`;
    return (
      <div className="relative h-full w-full overflow-hidden rounded-[inherit]">
        <iframe
          title={`${status.displayName || channel} live`}
          src={src}
          allow="autoplay; fullscreen"
          allowFullScreen
          className="h-full w-full border-none"
        />
        <span
          className="absolute left-2 top-2 inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-white"
          style={{ background: '#FF0040' }}
        >
          <span className="block h-1.5 w-1.5 animate-ping rounded-full bg-white" />
          Live
        </span>
        {Number.isFinite(status.viewers) && (
          <span className="absolute right-2 top-2 rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-bold text-white backdrop-blur">
            {fmtViewers(status.viewers)}
          </span>
        )}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-2">
          <div className="truncate text-[11px] font-bold text-white" title={status.title}>
            {status.title || status.displayName || channel}
          </div>
          {status.game && (
            <div className="truncate text-[10px] text-white/60">{status.game}</div>
          )}
        </div>
      </div>
    );
  }

  return (
    <a
      href={`https://twitch.tv/${encodeURIComponent(channel)}`}
      target="_blank"
      rel="noopener noreferrer"
      onPointerDown={(e) => e.stopPropagation()}
      className="flex h-full w-full items-center gap-3 px-4 py-3"
    >
      {status.avatar ? (
        <img
          src={status.avatar}
          alt={status.displayName || channel}
          className="h-10 w-10 flex-shrink-0 rounded-full grayscale"
        />
      ) : (
        <div
          className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
          style={{ background: accentColor }}
        >
          {(channel || '?').charAt(0).toUpperCase()}
        </div>
      )}
      <div className="min-w-0 flex-1">
        <div className="eyebrow" style={{ color: 'currentColor' }}>
          Twitch
        </div>
        <div className="truncate text-sm font-semibold tracking-tight">
          {status.displayName || channel}
        </div>
        <div className="text-[11px]" style={{ color: 'currentColor', opacity: 0.55 }}>
          {status.error === 'unconfigured' ? 'Twitch not configured' : 'Offline'}
        </div>
      </div>
    </a>
  );
}

function fmtViewers(n) {
  if (n < 1000) return `${n} viewers`;
  if (n < 10_000) return `${(n / 1000).toFixed(1)}k`;
  return `${Math.round(n / 1000)}k`;
}

function parents_() {
  const host = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
  // Twitch only accepts host (no scheme, no port). Always include localhost
  // so the widget keeps working in dev.
  const set = new Set([host, 'localhost', '127.0.0.1']);
  return Array.from(set);
}
