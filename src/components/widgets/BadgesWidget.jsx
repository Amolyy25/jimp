/**
 * Tiny rounded pills, one per badge (emoji + label).
 * Designed to sit under the avatar — keeps a light, airy feel.
 */
export default function BadgesWidget({ widget }) {
  const badges = widget.data.badges || [];

  if (!badges.length) {
    return (
      <div className="flex h-full items-center justify-center p-4 text-xs opacity-50">
        No badges yet
      </div>
    );
  }

  return (
    <div className="flex h-full w-full flex-wrap content-center items-center justify-center gap-2 px-4 py-3">
      {badges.map((b, i) => (
        <span
          key={i}
          className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-1 text-xs font-medium"
          style={{ color: 'currentColor' }}
        >
          <span aria-hidden>{b.emoji || '✨'}</span>
          <span style={{ opacity: 0.85 }}>{b.label || 'Badge'}</span>
        </span>
      ))}
    </div>
  );
}
