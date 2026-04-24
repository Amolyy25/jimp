import { detectProfanity } from '../../../utils/profanity.js';

/**
 * Labeled text / textarea / number / select input wrapper.
 * Keeps styling consistent across every panel.
 *
 * When `filter` is enabled, the value is scanned by the profanity filter; if
 * anything is detected, a red caption surfaces the offending tokens. We never
 * block typing — the warning is advisory and degrades gracefully if the user
 * ignores it.
 */
export default function TextInput({
  label,
  value,
  onChange,
  placeholder,
  textarea,
  maxLength,
  type = 'text',
  options,
  rows = 3,
  filter = false,
}) {
  const base =
    'w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-xs text-white/90 outline-none transition placeholder:text-white/30 focus:border-discord focus:bg-white/[0.06]';

  const hits = filter && typeof value === 'string' ? detectProfanity(value) : [];
  const hasHit = hits.length > 0;

  const warnClass = hasHit ? 'border-red-500/60 focus:border-red-400' : '';

  let field;
  if (options) {
    field = (
      <select
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        className={base}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    );
  } else if (textarea) {
    field = (
      <textarea
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        maxLength={maxLength}
        rows={rows}
        className={`${base} ${warnClass} resize-none leading-relaxed`}
      />
    );
  } else {
    field = (
      <input
        type={type}
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        maxLength={maxLength}
        className={`${base} ${warnClass}`}
      />
    );
  }

  return (
    <label className="block space-y-1.5">
      {label && (
        <div className="flex items-baseline justify-between">
          <span className="eyebrow">{label}</span>
          {maxLength != null && !options && (
            <span className="text-[10px] tabular-nums text-white/30">
              {(value || '').length}/{maxLength}
            </span>
          )}
        </div>
      )}
      {field}
      {hasHit && (
        <p className="flex items-start gap-1.5 text-[10px] font-medium text-red-400/90">
          <svg
            width="10"
            height="10"
            viewBox="0 0 24 24"
            fill="currentColor"
            className="mt-0.5 flex-shrink-0"
          >
            <path d="M12 2 1 21h22L12 2Zm0 6 7.5 13h-15L12 8Zm-1 3v5h2v-5h-2Zm0 6v2h2v-2h-2Z" />
          </svg>
          <span>
            Offensive words detected —{' '}
            <span className="font-mono">{hits.join(', ')}</span>. Consider
            rewording before sharing.
          </span>
        </p>
      )}
    </label>
  );
}
