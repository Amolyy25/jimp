import ColorInput from './controls/ColorInput.jsx';
import SliderInput from './controls/SliderInput.jsx';
import TextInput from './controls/TextInput.jsx';

/**
 * Per-widget visual style.
 * Any change is applied live — there's no save step.
 */
export default function StylePanel({ style, onUpdate }) {
  return (
    <div className="space-y-5">
      <section className="space-y-3">
        <SectionTitle>Background</SectionTitle>
        <ColorInput
          label="Background color"
          value={style.bgColor}
          onChange={(v) => onUpdate({ bgColor: v })}
        />
        <SliderInput
          label="Background opacity"
          min={0}
          max={1}
          step={0.01}
          value={style.bgOpacity ?? 0}
          onChange={(v) => onUpdate({ bgOpacity: v })}
          format={(v) => `${Math.round(v * 100)}%`}
        />
        <SliderInput
          label="Backdrop blur"
          min={0}
          max={30}
          step={1}
          value={style.blur ?? 0}
          onChange={(v) => onUpdate({ blur: v })}
          unit="px"
        />
        <p className="text-[11px] leading-relaxed text-white/40">
          Set opacity to 0% to make the widget blend directly into the page
          background (text-only floating feel).
        </p>
      </section>

      <div className="border-t border-white/5" />

      <section className="space-y-3">
        <SectionTitle>Border</SectionTitle>
        <ColorInput
          label="Border color"
          value={style.borderColor}
          onChange={(v) => onUpdate({ borderColor: v })}
        />
        <SliderInput
          label="Border opacity"
          min={0}
          max={1}
          step={0.01}
          value={style.borderOpacity ?? 0}
          onChange={(v) => onUpdate({ borderOpacity: v })}
          format={(v) => `${Math.round(v * 100)}%`}
        />
        <SliderInput
          label="Border width"
          min={0}
          max={4}
          step={1}
          value={style.borderWidth ?? 0}
          onChange={(v) => onUpdate({ borderWidth: v })}
          unit="px"
        />
        <SliderInput
          label="Radius"
          min={0}
          max={40}
          step={1}
          value={style.borderRadius ?? 0}
          onChange={(v) => onUpdate({ borderRadius: v })}
          unit="px"
        />
      </section>

      <div className="border-t border-white/5" />

      <section className="space-y-3">
        <SectionTitle>Layout</SectionTitle>
        <label className="flex items-center justify-between gap-4 rounded-xl border border-white/5 bg-white/[0.02] px-4 py-3">
          <div>
            <div className="text-xs font-semibold">Auto-size to content</div>
            <div className="text-[11px] leading-relaxed text-white/40">
              Widget hugs its content — adding items grows it symmetrically
              around its anchor. Position acts as the centre, size as a max
              bound.
            </div>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={!!style.autoSize}
            onClick={() => onUpdate({ autoSize: !style.autoSize })}
            className={[
              'relative h-6 w-10 flex-shrink-0 rounded-full border transition',
              style.autoSize
                ? 'border-discord bg-discord'
                : 'border-white/10 bg-white/10',
            ].join(' ')}
          >
            <span
              className={[
                'absolute top-0.5 h-4 w-4 rounded-full bg-white transition-transform',
                style.autoSize ? 'translate-x-5' : 'translate-x-0.5',
              ].join(' ')}
            />
          </button>
        </label>
      </section>

      <div className="border-t border-white/5" />

      <section className="space-y-3">
        <SectionTitle>Typography & Animation</SectionTitle>
        <TextInput
          label="Font Family"
          value={style.fontFamily || 'Inter'}
          onChange={(v) => onUpdate({ fontFamily: v })}
          options={[
            { value: 'Inter', label: 'Inter' },
            { value: 'Outfit', label: 'Outfit' },
            { value: 'Space Grotesk', label: 'Space Grotesk' },
            { value: 'Bebas Neue', label: 'Bebas Neue' },
            { value: 'Playfair Display', label: 'Playfair Display' },
            { value: 'JetBrains Mono', label: 'JetBrains Mono' },
          ]}
        />
        <TextInput
          label="Entrance Animation"
          value={style.animation || 'fade-up'}
          onChange={(v) => onUpdate({ animation: v })}
          options={[
            { value: 'none', label: 'None' },
            { value: 'fade-up', label: 'Fade Up' },
            { value: 'fade-in', label: 'Fade In' },
            { value: 'zoom-in', label: 'Zoom In' },
            { value: 'slide-right', label: 'Slide Right' },
            { value: 'bounce', label: 'Bounce' },
          ]}
        />
      </section>

      <div className="border-t border-white/5" />

      <section className="space-y-3">
        <SectionTitle>Presets</SectionTitle>
        <button
          onClick={() => onUpdate({
            bgOpacity: 0.1,
            blur: 16,
            bgColor: '#ffffff',
            borderWidth: 1,
            borderOpacity: 0.1,
            borderColor: '#ffffff',
            borderRadius: 24
          })}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 py-3 text-[11px] font-bold uppercase tracking-widest text-white/60 transition hover:border-discord/50 hover:bg-discord/10 hover:text-white"
        >
          ✨ Apply Glassmorphism
        </button>
      </section>
    </div>
  );
}

function SectionTitle({ children }) {
  return <h3 className="eyebrow">{children}</h3>;
}
