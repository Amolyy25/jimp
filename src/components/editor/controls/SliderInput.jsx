/**
 * Labeled range slider + live value readout.
 * Units default to empty; pass `unit` for `px`, `%`, etc.
 */
export default function SliderInput({
  label,
  value,
  onChange,
  min = 0,
  max = 100,
  step = 1,
  unit = '',
  format,
}) {
  const displayed = format ? format(value) : `${value}${unit}`;
  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between">
        <span className="eyebrow">{label}</span>
        <span className="text-[11px] font-medium tabular-nums text-white/70">
          {displayed}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
      />
    </div>
  );
}
