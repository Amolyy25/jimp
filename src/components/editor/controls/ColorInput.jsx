/**
 * Labeled color picker with a hex text input next to it.
 * Both inputs stay in sync — editing either updates the other.
 */
export default function ColorInput({ label, value, onChange }) {
  return (
    <div className="space-y-1.5">
      <span className="eyebrow">{label}</span>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={value || '#ffffff'}
          onChange={(e) => onChange(e.target.value)}
          className="h-8 w-8"
        />
        <input
          type="text"
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs font-mono text-white/90 outline-none transition focus:border-discord focus:bg-white/[0.06]"
          placeholder="#ffffff"
        />
      </div>
    </div>
  );
}
