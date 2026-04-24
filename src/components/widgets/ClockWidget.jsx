import { useEffect, useState } from 'react';

/** Live-updating clock. Ticks every 1s when seconds are shown, else every 10s. */
export default function ClockWidget({ widget }) {
  const { format24h, showSeconds } = widget.data;
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const interval = showSeconds ? 1000 : 10_000;
    const id = setInterval(() => setNow(new Date()), interval);
    return () => clearInterval(id);
  }, [showSeconds]);

  const hours = now.getHours();
  const mins = now.getMinutes();
  const secs = now.getSeconds();
  const meridian = hours >= 12 ? 'PM' : 'AM';

  const h = format24h ? hours : ((hours + 11) % 12) + 1;
  const hh = String(h).padStart(2, '0');
  const mm = String(mins).padStart(2, '0');
  const ss = String(secs).padStart(2, '0');

  return (
    <div className="flex h-full w-full flex-col items-center justify-center px-4">
      <div className="eyebrow mb-1" style={{ color: 'currentColor' }}>
        Local time
      </div>
      <div
        className="flex items-baseline gap-1.5 font-semibold tabular-nums tracking-tight"
        style={{ color: 'currentColor', fontSize: 'clamp(1.25rem, 2vw, 1.75rem)' }}
      >
        <span>{hh}</span>
        <span className="opacity-40">:</span>
        <span>{mm}</span>
        {showSeconds && (
          <>
            <span className="opacity-40">:</span>
            <span>{ss}</span>
          </>
        )}
        {!format24h && (
          <span className="eyebrow ml-1" style={{ color: 'currentColor' }}>
            {meridian}
          </span>
        )}
      </div>
    </div>
  );
}
