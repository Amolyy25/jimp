import { useState } from 'react';

/**
 * Grid of Discord server "cards".
 * Each card shows an icon (falls back to an initial), a name, a short
 * description, and a CTA to open the invite.
 */
export default function DiscordServersWidget({ widget, accent }) {
  const servers = widget.data.servers || [];
  const accentColor = accent || '#5865F2';

  if (!servers.length) {
    return (
      <WidgetShell>
        <EmptyState label="No servers yet" />
      </WidgetShell>
    );
  }

  return (
    <WidgetShell>
      {/* `auto-fit` (not auto-fill) collapses empty tracks so a single card
          stays centred instead of pinning to the left. `justify-items-center`
          centres each card within its track when content is narrower than
          the column. */}
      <div className="grid w-full grid-cols-[repeat(auto-fit,minmax(140px,1fr))] auto-rows-min gap-2.5 overflow-y-auto thin-scroll px-4 pb-4 justify-items-center">
        {servers.map((server) => (
          <ServerCard key={server.id} server={server} accent={accentColor} />
        ))}
      </div>
    </WidgetShell>
  );
}

function ServerCard({ server, accent }) {
  const [iconFailed, setIconFailed] = useState(false);
  const showImg = server.icon && !iconFailed;

  const hexToRgba = (hex, alpha) => {
    if (!hex || !hex.startsWith('#')) return `rgba(88, 101, 242, ${alpha})`;
    let h = hex.slice(1);
    if (h.length === 3) h = h.split('').map((c) => c + c).join('');
    const r = parseInt(h.slice(0, 2), 16);
    const g = parseInt(h.slice(2, 4), 16);
    const b = parseInt(h.slice(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  };

  return (
    <a
      href={server.invite || '#'}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex items-center gap-3 rounded-xl border border-white/5 bg-white/[0.02] p-3 transition-all duration-300 hover:-translate-y-0.5 hover:border-white/15 hover:bg-white/[0.04]"
      style={{
        boxShadow: 'none',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.boxShadow = `0 0 20px ${hexToRgba(accent, 0.15)}`;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = 'none';
      }}
    >
      <div 
        className="flex h-10 w-10 flex-shrink-0 items-center justify-center overflow-hidden rounded-xl text-sm font-semibold text-white"
        style={{ backgroundColor: hexToRgba(accent, 0.2) }}
      >
        {showImg ? (
          <img
            src={server.icon}
            alt={server.name}
            onError={() => setIconFailed(true)}
            className="h-full w-full object-cover"
          />
        ) : (
          (server.name || '?').charAt(0).toUpperCase()
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div
          className="truncate text-sm font-semibold tracking-tight"
          style={{ color: 'currentColor' }}
        >
          {server.name || 'Server'}
        </div>
        {server.description && (
          <div
            className="mt-0.5 truncate text-[11px] font-light leading-tight"
            style={{ color: 'currentColor', opacity: 0.55 }}
          >
            {server.description}
          </div>
        )}
      </div>
    </a>
  );
}

function WidgetShell({ children }) {
  return (
    <div className="flex h-full w-full flex-col">
      <div className="eyebrow px-4 pb-2 pt-3" style={{ color: 'currentColor' }}>
        Discord
      </div>
      {children}
    </div>
  );
}

function EmptyState({ label }) {
  return (
    <div className="flex h-full items-center justify-center px-4 pb-4 text-xs opacity-50">
      {label}
    </div>
  );
}
