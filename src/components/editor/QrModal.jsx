import { useEffect, useState } from 'react';
import { Download, X } from 'lucide-react';

/**
 * Lightweight QR modal — fetches /api/qr/:slug.png for the preview and
 * offers download links for both PNG and SVG. The server does the rendering
 * (qrcode lib + accent color), so the client just shows the result.
 *
 * `slug` is required — we never render this modal for a profile that
 * hasn't been claimed yet (the live URL wouldn't resolve).
 */
export default function QrModal({ slug, onClose }) {
  const [imgError, setImgError] = useState(false);
  // Cache-buster: when the user re-opens the modal after editing the
  // accent, force a fresh fetch by appending the current minute.
  const [bust] = useState(() => Math.floor(Date.now() / 60_000));

  const pngUrl = `/api/qr/${slug}.png?v=${bust}`;
  const svgUrl = `/api/qr/${slug}.svg?v=${bust}`;

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative w-[440px] max-w-[90vw] rounded-2xl border border-white/10 bg-ink-900 p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 rounded-full p-1.5 text-white/40 transition hover:bg-white/10 hover:text-white"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="eyebrow text-discord">QR code</div>
        <h2 className="mt-1 text-lg font-bold tracking-tight">Scan to open your profile</h2>
        <p className="mt-1 text-xs text-white/50">
          persn.me/{slug}
        </p>

        <div className="mt-4 flex aspect-square w-full items-center justify-center rounded-xl bg-white p-6">
          {imgError ? (
            <p className="text-xs text-red-400">Couldn't render QR.</p>
          ) : (
            <img
              src={pngUrl}
              alt={`QR code for /${slug}`}
              onError={() => setImgError(true)}
              className="h-full w-full object-contain"
            />
          )}
        </div>

        <div className="mt-4 flex gap-2">
          <a
            href={pngUrl}
            download={`persn-${slug}.png`}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-discord py-2.5 text-xs font-semibold text-white shadow-[0_0_30px_rgba(88,101,242,0.35)] transition hover:brightness-110"
          >
            <Download className="h-3.5 w-3.5" />
            PNG
          </a>
          <a
            href={svgUrl}
            download={`persn-${slug}.svg`}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 py-2.5 text-xs font-semibold text-white/70 transition hover:bg-white/10 hover:text-white"
          >
            <Download className="h-3.5 w-3.5" />
            SVG
          </a>
        </div>
      </div>
    </div>
  );
}
