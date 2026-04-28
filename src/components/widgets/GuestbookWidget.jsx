import { useEffect, useState } from 'react';
import { listGuestbook, postGuestbook, deleteGuestbookEntry, getMe } from '../../utils/api.js';

/**
 * Guestbook widget — visitors with an account can leave one short message
 * each. The widget shows up to N most recent entries. Entry deletion is
 * restricted by the server (author + profile owner).
 *
 * In the editor (no slug yet) we render a placeholder list so the user can
 * preview the layout. On /:slug we hit the real API.
 */
export default function GuestbookWidget({ widget, accent, slug }) {
  const max = widget.data?.maxEntries ?? 6;
  const [entries, setEntries] = useState([]);
  const [me, setMe] = useState(null);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const isEditorPreview = !slug;

  useEffect(() => {
    if (isEditorPreview) {
      setEntries(PREVIEW_ENTRIES);
      return;
    }
    let cancelled = false;
    (async () => {
      const [user, data] = await Promise.all([getMe(), listGuestbook(slug)]);
      if (cancelled) return;
      setMe(user);
      setEntries(data);
    })();
    return () => {
      cancelled = true;
    };
  }, [slug, isEditorPreview]);

  const submit = async (e) => {
    e.preventDefault();
    if (!draft.trim() || busy) return;
    setBusy(true);
    setError(null);
    try {
      const r = await postGuestbook(slug, draft.trim());
      const entry = r?.entry;
      if (entry) {
        setEntries((prev) => {
          const without = prev.filter((p) => p.author.id !== entry.author.id);
          return [entry, ...without];
        });
      }
      setDraft('');
    } catch (err) {
      setError(err.response?.data?.error || 'Could not post');
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id) => {
    try {
      await deleteGuestbookEntry(slug, id);
      setEntries((prev) => prev.filter((e) => e.id !== id));
    } catch {
      /* ignore */
    }
  };

  const accentColor = accent || '#5865F2';

  return (
    <div className="flex h-full w-full flex-col px-4 py-3">
      <div className="eyebrow mb-1.5" style={{ color: 'currentColor' }}>
        Guestbook
      </div>

      <ul className="flex-1 space-y-1.5 overflow-y-auto thin-scroll pr-1">
        {entries.slice(0, max).map((e) => (
          <li
            key={e.id}
            className="rounded-lg border border-white/5 bg-white/[0.03] px-2.5 py-1.5"
          >
            <div className="flex items-baseline justify-between gap-2">
              <span className="truncate text-[11px] font-bold" style={{ color: accentColor }}>
                @{e.author.username}
              </span>
              <span className="text-[9px] tabular-nums text-white/30">
                {timeAgo(e.createdAt)}
              </span>
            </div>
            <p className="mt-0.5 break-words text-[11px] leading-snug" style={{ color: 'currentColor', opacity: 0.85 }}>
              {e.message}
            </p>
            {!isEditorPreview && me?.id === e.author.id && (
              <button
                type="button"
                onClick={() => remove(e.id)}
                onPointerDown={(ev) => ev.stopPropagation()}
                className="mt-1 text-[9px] uppercase tracking-widest text-white/30 transition hover:text-red-300"
              >
                Delete
              </button>
            )}
          </li>
        ))}
        {entries.length === 0 && (
          <li className="text-center text-[11px] text-white/40">No notes yet — leave the first one.</li>
        )}
      </ul>

      {!isEditorPreview && me && (
        <form onSubmit={submit} className="mt-2 flex gap-1.5">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value.slice(0, 240))}
            onPointerDown={(e) => e.stopPropagation()}
            placeholder="Drop a note…"
            className="flex-1 rounded-lg border border-white/10 bg-black/30 px-2 py-1 text-[11px] text-white outline-none focus:border-discord/50"
          />
          <button
            type="submit"
            disabled={busy || !draft.trim()}
            className="rounded-lg px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-white disabled:opacity-30"
            style={{ background: accentColor }}
          >
            Post
          </button>
        </form>
      )}
      {!isEditorPreview && !me && (
        <p className="mt-2 text-center text-[10px] text-white/40">Sign in to leave a note.</p>
      )}
      {error && (
        <p className="mt-1 text-[10px] text-red-300/80">{error}</p>
      )}
    </div>
  );
}

const PREVIEW_ENTRIES = [
  { id: '1', message: 'great profile!!', author: { id: 'a', username: 'sample_user' }, createdAt: new Date().toISOString() },
  { id: '2', message: 'love this aesthetic ✨', author: { id: 'b', username: 'pixel_witch' }, createdAt: new Date(Date.now() - 3_600_000).toISOString() },
];

function timeAgo(date) {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
}
