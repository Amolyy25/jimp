import { useCallback, useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  answerQuestion,
  blockAsker,
  deleteQuestion,
  hideQuestion,
  listMyQuestions,
} from '../../utils/api.js';

/**
 * Owner-side inbox for the Q&A widget.
 *
 * Three tabs: Pending (default), Answered, Hidden.
 * Polls every 30s while open so a new submission shows up without manual
 * refresh. Inline answer composer keeps actions one click away — speed
 * matters because the time-to-answer drives whether visitors keep asking.
 */
export default function InboxPanel({ hasQAWidget }) {
  const [tab, setTab] = useState('PENDING');
  const [items, setItems] = useState([]);
  const [counts, setCounts] = useState({ pending: 0 });
  const [busyId, setBusyId] = useState(null);
  const [draft, setDraft] = useState({}); // questionId → answer text
  const [error, setError] = useState(null);

  const refresh = useCallback(async () => {
    const data = await listMyQuestions({ status: tab, limit: 30 });
    setItems(data.items || []);
    setCounts(data.counts || { pending: 0 });
  }, [tab]);

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, 30_000);
    return () => clearInterval(id);
  }, [refresh]);

  const onAnswer = async (id) => {
    const text = (draft[id] || '').trim();
    if (!text) return;
    setBusyId(id);
    setError(null);
    try {
      await answerQuestion(id, text);
      setDraft((d) => {
        const next = { ...d };
        delete next[id];
        return next;
      });
      await refresh();
    } catch (err) {
      setError(err?.response?.data?.error || 'Failed to answer.');
    } finally {
      setBusyId(null);
    }
  };

  const onHide = async (id) => {
    setBusyId(id);
    try {
      await hideQuestion(id);
      await refresh();
    } finally {
      setBusyId(null);
    }
  };

  const onDelete = async (id) => {
    if (!confirm('Delete this message? It cannot be recovered.')) return;
    setBusyId(id);
    try {
      await deleteQuestion(id);
      await refresh();
    } finally {
      setBusyId(null);
    }
  };

  const onBlock = async (id) => {
    if (!confirm('Block this anonymous sender? They won\'t be able to reach you for ~24h.')) return;
    setBusyId(id);
    try {
      await blockAsker(id);
      await refresh();
    } finally {
      setBusyId(null);
    }
  };

  const tabs = useMemo(
    () => [
      { id: 'PENDING', label: 'Pending', badge: counts.pending },
      { id: 'ANSWERED', label: 'Answered' },
      { id: 'HIDDEN', label: 'Hidden' },
    ],
    [counts.pending],
  );

  return (
    <div className="space-y-4">
      <Tabs tabs={tabs} active={tab} onChange={setTab} />

      {!hasQAWidget && (
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/[0.06] p-3 text-[11px] leading-relaxed text-amber-100/80">
          You don't have the Q&A widget on your profile yet. Add one from the
          Widgets tab so visitors can send you anonymous messages.
        </div>
      )}

      {error && (
        <div className="rounded-md border border-red-500/20 bg-red-500/[0.06] p-2.5 text-[11px] text-red-200">
          {error}
        </div>
      )}

      {items.length === 0 ? (
        <EmptyState tab={tab} hasQAWidget={hasQAWidget} />
      ) : (
        <ul className="space-y-3">
          <AnimatePresence initial={false}>
            {items.map((q) => (
              <motion.li
                key={q.id}
                layout
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96, transition: { duration: 0.15 } }}
                transition={{ duration: 0.25 }}
                className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3"
              >
                <div className="flex items-start gap-2">
                  <span className="mt-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-white/[0.04] text-[9px] font-bold uppercase tracking-[0.18em] text-white/50">
                    Q
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="break-words text-[12.5px] leading-relaxed text-white/90">
                      {q.body}
                    </p>
                    <p className="mt-1 font-mono text-[9px] uppercase tracking-[0.2em] text-white/30">
                      {timeAgo(q.createdAt)}
                    </p>
                  </div>
                </div>

                {q.answer && (
                  <div className="mt-2 ml-7 rounded-lg border border-white/[0.06] bg-white/[0.02] p-2">
                    <p className="text-[12px] leading-relaxed text-white/85">{q.answer}</p>
                  </div>
                )}

                {tab === 'PENDING' && (
                  <div className="ml-7 mt-2 space-y-2">
                    <textarea
                      rows={2}
                      placeholder="Write a public answer…"
                      value={draft[q.id] || ''}
                      onChange={(e) =>
                        setDraft((d) => ({ ...d, [q.id]: e.target.value.slice(0, 1000) }))
                      }
                      className="w-full resize-none rounded-md border border-white/10 bg-white/[0.03] px-2.5 py-2 text-[12px] text-white placeholder:text-white/30 outline-none transition focus:border-white/20"
                      maxLength={1000}
                    />
                    <div className="flex flex-wrap items-center gap-1.5">
                      <button
                        type="button"
                        disabled={busyId === q.id || !(draft[q.id] || '').trim()}
                        onClick={() => onAnswer(q.id)}
                        className="rounded-full bg-discord px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-white transition hover:brightness-110 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        Answer publicly
                      </button>
                      <button
                        type="button"
                        disabled={busyId === q.id}
                        onClick={() => onHide(q.id)}
                        className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/60 transition hover:bg-white/[0.06] hover:text-white"
                      >
                        Hide
                      </button>
                      <button
                        type="button"
                        disabled={busyId === q.id}
                        onClick={() => onBlock(q.id)}
                        className="rounded-full border border-amber-400/30 bg-amber-400/[0.05] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-amber-200/80 transition hover:bg-amber-400/[0.12]"
                      >
                        Block sender
                      </button>
                      <button
                        type="button"
                        disabled={busyId === q.id}
                        onClick={() => onDelete(q.id)}
                        className="rounded-full border border-red-400/30 bg-red-400/[0.05] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-red-200/80 transition hover:bg-red-400/[0.12]"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                )}

                {tab === 'ANSWERED' && (
                  <div className="ml-7 mt-2 flex gap-1.5">
                    <button
                      type="button"
                      disabled={busyId === q.id}
                      onClick={() => onHide(q.id)}
                      className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/60 transition hover:bg-white/[0.06] hover:text-white"
                    >
                      Hide
                    </button>
                    <button
                      type="button"
                      disabled={busyId === q.id}
                      onClick={() => onDelete(q.id)}
                      className="rounded-full border border-red-400/30 bg-red-400/[0.05] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-red-200/80 transition hover:bg-red-400/[0.12]"
                    >
                      Delete
                    </button>
                  </div>
                )}
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
      )}
    </div>
  );
}

function Tabs({ tabs, active, onChange }) {
  return (
    <div className="flex gap-1 rounded-full border border-white/[0.06] bg-white/[0.02] p-1">
      {tabs.map((t) => (
        <button
          key={t.id}
          type="button"
          onClick={() => onChange(t.id)}
          className={[
            'relative flex flex-1 items-center justify-center gap-1.5 rounded-full px-2 py-1.5 text-[10px] font-bold uppercase tracking-[0.18em] transition',
            active === t.id
              ? 'bg-white/[0.07] text-white'
              : 'text-white/40 hover:text-white/70',
          ].join(' ')}
        >
          {t.label}
          {Number.isFinite(t.badge) && t.badge > 0 && (
            <span
              className={[
                'inline-flex h-4 min-w-[16px] items-center justify-center rounded-full px-1 text-[9px] tabular-nums',
                active === t.id ? 'bg-discord text-white' : 'bg-white/10 text-white/70',
              ].join(' ')}
            >
              {t.badge > 99 ? '99+' : t.badge}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}

function EmptyState({ tab, hasQAWidget }) {
  if (!hasQAWidget) {
    return (
      <p className="pt-3 text-[12px] italic text-white/40">
        Once your Q&A widget is up, messages will land here.
      </p>
    );
  }
  if (tab === 'PENDING') {
    return (
      <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 text-center">
        <p className="text-[12.5px] text-white/65">No new messages.</p>
        <p className="mt-1 text-[11px] text-white/40">
          Share your profile and they'll come.
        </p>
      </div>
    );
  }
  if (tab === 'ANSWERED') {
    return <p className="pt-3 text-[12px] italic text-white/40">Nothing answered yet.</p>;
  }
  return <p className="pt-3 text-[12px] italic text-white/40">Nothing hidden.</p>;
}

/** Compact "3m / 2h / 4d" formatter — keeps the inbox dense. */
function timeAgo(iso) {
  const d = new Date(iso);
  const sec = Math.max(0, Math.round((Date.now() - d.getTime()) / 1000));
  if (sec < 60) return `${sec}s ago`;
  const min = Math.round(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.round(hr / 24);
  if (day < 7) return `${day}d ago`;
  return d.toLocaleDateString();
}
