/**
 * Visitor counter widget.
 *
 * On a public profile (View page), `viewsTotal` is the real count of distinct
 * anonymous sessions on this profile, computed server-side from the
 * `ViewEvent` table — same source of truth as the owner's analytics page.
 *
 * In the editor preview where the prop is unavailable, we fall back to a
 * client-side localStorage counter so the widget still feels alive while
 * arranging the canvas.
 */
export default function VisitorCounterWidget({ widget, viewsTotal }) {
  const usingReal = typeof viewsTotal === 'number' && viewsTotal >= 0;
  const count = usingReal ? viewsTotal : readLocal(widget);

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

function readLocal(widget) {
  const key = `persn:visits:${widget?.data?.storageKey || 'default'}`;
  try {
    const raw = window.localStorage.getItem(key);
    const n = raw == null ? 0 : parseInt(raw, 10);
    return Number.isFinite(n) ? n : 0;
  } catch {
    return 0;
  }
}
