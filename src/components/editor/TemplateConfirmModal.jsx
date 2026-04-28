/**
 * Confirmation modal shown right before a template is applied.
 *
 * Applying a template overwrites the entire profile (theme + widgets +
 * positions + background + music). For an authenticated user with auto-save
 * on, that change will be persisted within 5s — so we never want to commit
 * silently. One click here to confirm; one to back out.
 */
export default function TemplateConfirmModal({ template, onConfirm, onCancel }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onCancel}
    >
      <div
        className="w-[440px] max-w-[90vw] rounded-2xl border border-white/10 bg-ink-900 p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center gap-3">
          <div
            className="h-12 w-12 flex-shrink-0 rounded-xl"
            style={{ background: thumbnail(template) }}
          />
          <div>
            <div className="eyebrow text-discord">Apply template</div>
            <h2 className="text-lg font-bold tracking-tight">{template.name}</h2>
          </div>
        </div>

        <p className="text-sm leading-relaxed text-white/60">
          This will replace your current profile — theme colours, background,
          widgets, layout, all of it. Your custom URL and account stay the
          same.
        </p>
        <p className="mt-2 text-xs text-amber-300/80">
          You can undo via <span className="font-semibold">History</span> after
          saving.
        </p>

        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-full border border-white/10 bg-white/5 px-5 py-2 text-xs font-semibold text-white/70 transition hover:bg-white/10 hover:text-white"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="rounded-full bg-discord px-5 py-2 text-xs font-semibold text-white shadow-[0_0_30px_rgba(88,101,242,0.35)] transition hover:brightness-110"
          >
            Apply template
          </button>
        </div>
      </div>
    </div>
  );
}

function thumbnail(template) {
  // Best-effort: prefer the thumbnailGradient if the caller passed it,
  // otherwise fall back to a solid swatch derived from the resolved accent.
  if (template?.thumbnailGradient) return template.thumbnailGradient;
  const accent = template?.profile?.theme?.accent;
  if (typeof accent === 'string') return accent;
  if (accent?.kind === 'gradient')
    return `linear-gradient(${accent.angle ?? 135}deg, ${accent.from}, ${accent.to})`;
  if (accent?.value) return accent.value;
  return '#5865F2';
}
