import { useState } from 'react';
import { createPortal } from 'react-dom';
import { SOCIALS } from '../../utils/socials.jsx';

/**
 * Row of social icons.
 * - Clickable platforms open in a new tab.
 * - Discord (and any social marked `copy`) copy the handle to the clipboard.
 *
 * The "copied" toast is rendered via a portal into <body>, otherwise the
 * surrounding WidgetFrame's `overflow: hidden` clips it (it sits above the
 * icon and gets cut). The toast is fixed at the bottom of the viewport so
 * it never collides with widget edges.
 */
export default function SocialsWidget({ widget, accent }) {
  const links = widget.data.links || {};
  const hidden = new Set(widget.data.hidden || []);
  const actions = widget.data.actions || {};
  const [toast, setToast] = useState(null); // { handle: string }
  const accentColor = accent || '#5865F2';

  // Only render socials that the user has filled in.
  const entries = SOCIALS.filter((s) => !hidden.has(s.id) && (links[s.id] || '').trim());

  if (!entries.length) {
    return (
      <div className="flex h-full items-center justify-center px-4 py-2 text-xs opacity-50">
        Add social links in the editor
      </div>
    );
  }

  const onCopy = async (handle) => {
    try {
      await navigator.clipboard.writeText(handle);
      setToast({ handle });
      setTimeout(() => setToast(null), 1800);
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="flex h-full w-full flex-wrap content-center items-center justify-center gap-3 px-4 py-2">
      {entries.map((s) => {
        const handle = links[s.id];
        const action = !s.href ? 'copy' : (actions[s.id] || (s.copy ? 'copy' : 'link'));
        const common = {
          className:
            'group relative flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/[0.03] transition duration-300 hover:scale-110',
          style: { color: 'currentColor' },
          title: `${s.label}: ${handle}`,
          'aria-label': s.label,
        };

        const content = (
          <>
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              className="transition-colors duration-300 group-hover:text-white"
              style={{ color: 'currentColor' }}
            >
              {s.svg}
            </svg>
            <span
              className="pointer-events-none absolute inset-0 rounded-full opacity-0 transition-opacity duration-300 group-hover:opacity-30"
              style={{ boxShadow: `inset 0 0 0 9999px ${s.color}`, mixBlendMode: 'color' }}
            />
          </>
        );

        if (action === 'copy') {
          return (
            <button key={s.id} type="button" onClick={() => onCopy(handle)} {...common}>
              {content}
            </button>
          );
        }

        return (
          <a
            key={s.id}
            href={s.href(handle)}
            target="_blank"
            rel="noopener noreferrer"
            {...common}
          >
            {content}
          </a>
        );
      })}

      {toast && typeof document !== 'undefined' &&
        createPortal(
          <CopyToast handle={toast.handle} accentColor={accentColor} />,
          document.body,
        )}
    </div>
  );
}

/**
 * Fixed bottom-of-viewport toast. Rendered through a portal so it escapes
 * the widget's overflow-hidden frame and never gets clipped — regardless of
 * where the social pill lives on the canvas.
 */
function CopyToast({ handle, accentColor }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 bottom-6 z-[60] flex justify-center px-4"
    >
      <div
        className="pointer-events-auto flex max-w-[90vw] items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold text-white shadow-2xl backdrop-blur-md"
        style={{ backgroundColor: accentColor }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
          <path d="M5 12l5 5L20 7" />
        </svg>
        <span className="truncate">{handle} copié</span>
      </div>
    </div>
  );
}
