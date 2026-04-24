import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, ArrowUpRight, Loader2, Eye, EyeOff } from 'lucide-react';
import AuthLayout from '../components/AuthLayout.jsx';
import { login } from '../utils/api.js';

export default function Login() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [revealPw, setRevealPw] = useState(false);
  const [formData, setFormData] = useState({ email: '', password: '' });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await login(formData.email, formData.password);
      navigate('/editor');
    } catch (err) {
      setError(err.response?.data?.error || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title="SIGN IN."
      subtitle="Welcome back. Pick up where you left off and ship that profile."
      footer={
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-white/40">
          No account?{' '}
          <Link to="/register" className="font-bold text-white transition hover:text-discord">
            Create one →
          </Link>
        </p>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {error && <ErrorBanner>{error}</ErrorBanner>}

        <Field
          label="Email"
          icon={Mail}
          type="email"
          autoComplete="email"
          required
          value={formData.email}
          onChange={(v) => setFormData({ ...formData, email: v })}
          placeholder="you@domain.com"
        />

        <Field
          label="Password"
          icon={Lock}
          type={revealPw ? 'text' : 'password'}
          autoComplete="current-password"
          required
          value={formData.password}
          onChange={(v) => setFormData({ ...formData, password: v })}
          placeholder="••••••••"
          trailing={
            <button
              type="button"
              onClick={() => setRevealPw((v) => !v)}
              className="flex h-7 w-7 items-center justify-center rounded-md text-white/40 transition hover:bg-white/5 hover:text-white"
              aria-label={revealPw ? 'Hide password' : 'Show password'}
            >
              {revealPw ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
            </button>
          }
          aside={
            <Link
              to="/forgot"
              className="font-mono text-[9px] uppercase tracking-[0.22em] text-white/40 transition hover:text-discord"
            >
              Forgot?
            </Link>
          }
        />

        <button
          disabled={loading}
          className="group relative mt-2 flex h-12 w-full items-center justify-center gap-2 overflow-hidden rounded-md bg-discord font-mono text-[11px] font-bold uppercase tracking-[0.22em] text-white transition active:scale-[0.99] disabled:opacity-50"
        >
          <span className="absolute inset-0 bg-gradient-to-b from-white/15 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
          {loading ? (
            <Loader2 className="relative h-5 w-5 animate-spin" />
          ) : (
            <>
              <span className="relative">Continue</span>
              <ArrowUpRight className="relative h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </>
          )}
        </button>

        <p className="pt-2 text-center font-mono text-[9px] uppercase tracking-[0.22em] text-white/25">
          Encrypted session · httpOnly cookie · 7-day life
        </p>
      </form>
    </AuthLayout>
  );
}

/* -------------------------------------------------------------------------- */
/* Shared field & error components — used by Register too                      */
/* -------------------------------------------------------------------------- */

export function Field({
  label,
  icon: Icon,
  type = 'text',
  value,
  onChange,
  placeholder,
  autoComplete,
  required,
  trailing,
  aside,
  hint,
  maxLength,
}) {
  return (
    <label className="block space-y-1.5">
      <div className="flex items-center justify-between pl-1">
        <span className="font-mono text-[9px] uppercase tracking-[0.24em] text-white/40">
          {label}
        </span>
        {aside}
      </div>
      <div className="group relative">
        {Icon && (
          <Icon className="absolute left-4 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-white/30 transition group-focus-within:text-discord" />
        )}
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          autoComplete={autoComplete}
          required={required}
          maxLength={maxLength}
          className={[
            'h-12 w-full rounded-md border border-white/10 bg-white/[0.02] text-[14px] text-white outline-none transition',
            'placeholder:text-white/20 placeholder:font-normal',
            'focus:border-discord/60 focus:bg-white/[0.04] focus:shadow-[0_0_0_4px_rgba(88,101,242,0.08)]',
            Icon ? 'pl-11' : 'pl-4',
            trailing ? 'pr-12' : 'pr-4',
          ].join(' ')}
        />
        {trailing && (
          <div className="absolute right-2.5 top-1/2 -translate-y-1/2">
            {trailing}
          </div>
        )}
      </div>
      {hint && (
        <p className="pl-1 font-mono text-[9px] uppercase tracking-[0.2em] text-white/30">
          {hint}
        </p>
      )}
    </label>
  );
}

export function ErrorBanner({ children }) {
  return (
    <div className="flex items-start gap-2 rounded-md border border-red-500/20 bg-red-500/[0.07] px-3 py-2.5">
      <span className="mt-1 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-red-400" />
      <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-red-200">
        {children}
      </span>
    </div>
  );
}
