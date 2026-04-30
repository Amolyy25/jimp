import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { listAnsweredQuestions, sendQuestion } from '../../utils/api.js';
import { getCaptchaToken, isCaptchaEnabled } from '../../utils/captcha.js';

/**
 * Anonymous Q&A widget.
 *
 * Two states stacked vertically:
 *   1. Compose box: textarea + counter + invisible captcha + submit
 *   2. Answered list: scroll-paginated cards (question + owner answer)
 *
 * In the editor (no slug), we render a placeholder list for layout preview
 * and disable the textarea — actual sending requires a real slug.
 */
const BODY_MAX = 480; // server caps at 500; we surface 480 to cushion paste glitches.

export default function QAWidget({ widget, accent, accentCss, slug }) {
  const isEditorPreview = !slug;
  const [items, setItems] = useState([]);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState(null); // { kind: 'ok' | 'err', message }
  const title = widget.data?.title || 'Send me a message';
  const placeholder = widget.data?.placeholder || 'Anything anonymous…';
  const max = widget.data?.maxAnswered ?? 6;
  const overLimit = draft.length > BODY_MAX;
  const empty = draft.trim().length === 0;

  useEffect(() => {
    if (isEditorPreview) {
      setItems(PREVIEW_ITEMS.slice(0, max));
      return;
    }
    let cancelled = false;
    (async () => {
      const data = await listAnsweredQuestions(slug, { limit: max });
      if (cancelled) return;
      setItems(data.items || []);
    })();
    return () => {
      cancelled = true;
    };
  }, [slug, max, isEditorPreview]);

  const onSubmit = async (e) => {
    e.preventDefault();
    if (busy || empty || overLimit || isEditorPreview) return;
    setBusy(true);
    setFeedback(null);
    try {
      const token = isCaptchaEnabled() ? await getCaptchaToken() : null;
      await sendQuestion(slug, draft.trim(), token);
      setDraft('');
      setFeedback({ kind: 'ok', message: 'Sent. Hope they answer!' });
      // Auto-clear the success badge after 4s.
      setTimeout(() => setFeedback(null), 4000);
    } catch (err) {
      const apiError =
        err?.response?.data?.error || err?.message || 'Could not send.';
      setFeedback({ kind: 'err', message: apiError });
    } finally {
      setBusy(false);
    }
  };

  const counterColor =
    draft.length > BODY_MAX
      ? 'text-red-400'
      : draft.length > BODY_MAX * 0.85
        ? 'text-amber-300'
        : 'text-white/30';

  return (
    <div className="flex h-full w-full flex-col gap-3 p-4">
      <div className="flex items-center gap-2">
        <span
          className="inline-flex h-1.5 w-1.5 rounded-full"
          style={{ background: accent || '#5865F2' }}
          aria-hidden
        />
        <h3 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/60">
          {title}
        </h3>
      </div>

      <form onSubmit={onSubmit} className="relative">
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value.slice(0, BODY_MAX + 20))}
          placeholder={placeholder}
          disabled={busy || isEditorPreview}
          rows={3}
          className="w-full resize-none rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5 text-[13px] text-white placeholder:text-white/30 outline-none transition focus:border-white/20 focus:bg-white/[0.06] disabled:opacity-50"
          style={{
            // accent the focus glow with the user's chosen colour
            boxShadow: 'none',
          }}
          maxLength={BODY_MAX + 20}
          aria-label="Anonymous message"
        />

        <div className="mt-2 flex items-center justify-between gap-2">
          <span className={`font-mono text-[10px] tabular-nums ${counterColor}`}>
            {draft.length}/{BODY_MAX}
          </span>
          <button
            type="submit"
            disabled={busy || empty || overLimit || isEditorPreview}
            className="group relative flex h-8 items-center gap-1.5 overflow-hidden rounded-full px-3 text-[10px] font-bold uppercase tracking-[0.18em] text-white transition active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
            style={{
              background:
                accentCss && accentCss.startsWith('linear-gradient(')
                  ? accentCss
                  : accent || '#5865F2',
            }}
          >
            <span className="relative">{busy ? 'Sending…' : 'Send'}</span>
            {!busy && (
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" className="relative transition-transform duration-300 group-hover:translate-x-0.5">
                <path d="M5 12h14M13 6l6 6-6 6" />
              </svg>
            )}
          </button>
        </div>

        <AnimatePresence>
          {feedback && (
            <motion.p
              key={feedback.message}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.2 }}
              className={`mt-1.5 text-[11px] ${feedback.kind === 'ok' ? 'text-green-300/90' : 'text-red-300/90'}`}
            >
              {feedback.message}
            </motion.p>
          )}
        </AnimatePresence>

        <p className="mt-1.5 font-mono text-[9px] uppercase tracking-[0.2em] text-white/25">
          Anonymous · No login required
        </p>
      </form>

      {/* Answered list — collapses gracefully when empty */}
      <div className="mt-1 flex-1 overflow-y-auto thin-scroll pr-1">
        {items.length === 0 ? (
          <p className="pt-2 text-[12px] italic text-white/40">
            {isEditorPreview
              ? 'Answers will show up here.'
              : 'No answers yet. Be the first to ask!'}
          </p>
        ) : (
          <ul className="space-y-2.5">
            {items.map((q, i) => (
              <motion.li
                key={q.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(i * 0.04, 0.3), duration: 0.3 }}
                className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-2.5"
              >
                <div className="flex items-start gap-1.5">
                  <span className="select-none text-[10px] uppercase tracking-[0.18em] text-white/30">
                    Q
                  </span>
                  <p className="flex-1 text-[12px] text-white/80">{q.body}</p>
                </div>
                {q.answer && (
                  <div className="mt-2 flex items-start gap-1.5 border-t border-white/[0.05] pt-2">
                    <span
                      className="select-none text-[10px] font-bold uppercase tracking-[0.18em]"
                      style={{ color: accent || '#5865F2' }}
                    >
                      A
                    </span>
                    <p className="flex-1 text-[12px] leading-relaxed text-white/95">
                      {q.answer}
                    </p>
                  </div>
                )}
              </motion.li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

/** Lifelike preview rows for the editor canvas — never sent to real users. */
const PREVIEW_ITEMS = [
  {
    id: 'p1',
    body: 'How do you stay motivated on long projects?',
    answer: 'Tiny daily progress + a public deadline.',
  },
  {
    id: 'p2',
    body: 'Best track you discovered this month?',
    answer: 'Gone — Saint Levant. Loop on repeat.',
  },
];
