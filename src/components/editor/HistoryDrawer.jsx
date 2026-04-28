import { useEffect, useState } from 'react';
import { Loader2, RotateCcw, X } from 'lucide-react';
import { listMyVersions, restoreVersion } from '../../utils/api.js';

/**
 * Right-side drawer listing the last ~20 saved snapshots of the profile.
 *
 * Each row shows when the save happened + a tiny summary (widget count,
 * dominant accent). Clicking "Restore" hits POST /restore and bubbles the
 * restored profile data up so Editor.jsx can replace the in-memory
 * profile and let auto-save persist the change.
 *
 * No previews are rendered — generating a thumbnail per version would mean
 * pulling the whole blob client-side and re-rendering the canvas off-screen.
 * For now we keep the drawer text-only; a thumbnail pass can build on
 * server-rendered OG images later.
 */
export default function HistoryDrawer({ slug, onClose, onRestored }) {
  const [versions, setVersions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [restoring, setRestoring] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    listMyVersions().then((rows) => {
      if (cancelled) return;
      setVersions(rows);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [slug]);

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const handleRestore = async (id) => {
    setRestoring(id);
    setError(null);
    try {
      const res = await restoreVersion(id);
      if (!res?.data) throw new Error('Empty response');
      onRestored(res.data);
    } catch (err) {
      setError(err.message || 'Restore failed');
    } finally {
      setRestoring(null);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-[2px]"
      onClick={onClose}
    >
      <aside
        className="flex h-full w-[380px] max-w-[92vw] flex-col border-l border-white/10 bg-ink-900 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-center justify-between border-b border-white/5 px-5 py-4">
          <div>
            <div className="eyebrow text-discord">History</div>
            <h2 className="mt-0.5 text-base font-bold tracking-tight">Recent saves</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1.5 text-white/40 transition hover:bg-white/10 hover:text-white"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto thin-scroll p-3">
          {loading ? (
            <div className="flex items-center justify-center py-12 text-white/30">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : versions.length === 0 ? (
            <p className="px-3 py-6 text-xs text-white/40">
              No saved versions yet. Once you start saving, the last 20 snapshots
              will show up here.
            </p>
          ) : (
            <ul className="space-y-2">
              {versions.map((v, i) => (
                <li
                  key={v.id}
                  className="rounded-xl border border-white/5 bg-white/[0.02] p-3"
                >
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="text-xs font-semibold">
                      {i === 0 ? 'Current' : formatRelative(v.createdAt)}
                    </span>
                    <span className="text-[10px] tabular-nums text-white/40">
                      {new Date(v.createdAt).toLocaleString()}
                    </span>
                  </div>
                  <div className="mt-1 text-[11px] text-white/50">
                    {v.summary?.widgets ?? 0} widgets
                    {v.summary?.accent ? ` · accent ${v.summary.accent}` : ''}
                  </div>
                  {i !== 0 && (
                    <button
                      type="button"
                      onClick={() => handleRestore(v.id)}
                      disabled={restoring === v.id}
                      className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-white/70 transition hover:bg-discord/15 hover:text-white disabled:opacity-40"
                    >
                      {restoring === v.id ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <RotateCcw className="h-3 w-3" />
                      )}
                      Restore
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}

          {error && (
            <p className="mt-3 rounded-lg border border-red-400/20 bg-red-400/10 px-3 py-2 text-xs text-red-200">
              {error}
            </p>
          )}
        </div>
      </aside>
    </div>
  );
}

function formatRelative(date) {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}
