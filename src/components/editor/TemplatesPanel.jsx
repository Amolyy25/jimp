import { TEMPLATES } from '../../utils/templates.js';

/**
 * Sidebar gallery — picks a preset and hands its full profile blob up to
 * Editor.jsx via `onApply`. Editor opens a confirmation modal before
 * actually overwriting the user's current profile, so this component never
 * has to care about what's currently on the canvas.
 */
export default function TemplatesPanel({ onApply }) {
  return (
    <div className="space-y-3">
      <div>
        <h3 className="text-sm font-bold text-white">Pick a starting point</h3>
        <p className="mt-1 text-[11px] leading-relaxed text-white/40">
          Each template replaces the current profile entirely — colours,
          background, widgets and positions. You can tweak everything after.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2.5">
        {TEMPLATES.map((tpl) => (
          <button
            key={tpl.id}
            type="button"
            onClick={() =>
              onApply?.({
                id: tpl.id,
                name: tpl.name,
                profile: tpl.profile(),
              })
            }
            className="group flex flex-col overflow-hidden rounded-xl border border-white/5 bg-white/[0.02] text-left transition hover:border-discord/40 hover:bg-white/[0.05]"
          >
            <div
              className="relative h-20 w-full overflow-hidden"
              style={{ background: tpl.thumbnailGradient }}
            >
              <span className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
              <span className="absolute bottom-1.5 left-2 text-[10px] font-bold uppercase tracking-widest text-white/90">
                {tpl.name}
              </span>
            </div>
            <div className="flex flex-wrap gap-1 px-2.5 py-2">
              {tpl.tags.map((t) => (
                <span
                  key={t}
                  className="rounded-full bg-white/5 px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wider text-white/50"
                >
                  {t}
                </span>
              ))}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
