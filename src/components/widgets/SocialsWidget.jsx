import { useState } from 'react';
import { SOCIALS } from '../../utils/socials.jsx';

/**
 * Row of social icons.
 * - Clickable platforms open in a new tab.
 * - Discord handles aren't linkable → clicking copies the tag to clipboard.
 */
export default function SocialsWidget({ widget, accent }) {
  const links = widget.data.links || {};
  const hidden = new Set(widget.data.hidden || []);
  const actions = widget.data.actions || {};
  const [copied, setCopied] = useState(null);
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

  const onCopy = async (handle, id) => {
    try {
      await navigator.clipboard.writeText(handle);
      setCopied(id);
      setTimeout(() => setCopied(null), 1500);
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="flex h-full w-full flex-wrap content-center items-center gap-3 px-4 py-2">
      {entries.map((s) => {
        const handle = links[s.id];
        const action = actions[s.id] || (s.copy ? 'copy' : 'link');
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
            {copied === s.id && (
              <span 
                className="absolute -top-7 whitespace-nowrap rounded-md px-2 py-0.5 text-[10px] font-bold text-white shadow-lg animate-bounce"
                style={{ backgroundColor: accentColor }}
              >
                Copied!
              </span>
            )}
          </>
        );

        if (action === 'copy') {
          return (
            <button key={s.id} type="button" onClick={() => onCopy(handle, s.id)} {...common}>
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
    </div>
  );
}
