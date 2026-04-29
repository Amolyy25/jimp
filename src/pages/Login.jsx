import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, ArrowUpRight, Loader2, Eye, EyeOff } from 'lucide-react';
import AuthLayout from '../components/AuthLayout.jsx';
import { discordConnectUrl, login } from '../utils/api.js';

export default function Login() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [revealPw, setRevealPw] = useState(false);
  const [formData, setFormData] = useState({ email: '', password: '' });

  // Surface Discord OAuth failures (the callback redirects here with a flag).
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const flag = params.get('discord');
    if (!flag) return;
    const map = {
      denied: 'Discord sign-in was cancelled.',
      no_email: 'Your Discord account has no verified email — verify it on Discord, then try again.',
      state_mismatch: 'Discord sign-in state mismatch. Please retry.',
      error: 'Discord sign-in failed. Please retry.',
    };
    if (map[flag]) setError(map[flag]);
    window.history.replaceState({}, '', window.location.pathname);
  }, []);

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

        <DiscordButton label="Continue with Discord" />
        <Divider />

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

/** Big "Continue with Discord" button. Triggers a same-tab nav to OAuth. */
export function DiscordButton({ label = 'Continue with Discord' }) {
  return (
    <a
      href={discordConnectUrl()}
      className="group relative flex h-12 w-full items-center justify-center gap-2.5 overflow-hidden rounded-md bg-[#5865F2] font-mono text-[11px] font-bold uppercase tracking-[0.22em] text-white transition active:scale-[0.99] hover:brightness-110"
    >
      <span className="absolute inset-0 bg-gradient-to-b from-white/15 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
      <DiscordMark />
      <span className="relative">{label}</span>
    </a>
  );
}

export function Divider({ label = 'or' }) {
  return (
    <div className="relative flex items-center gap-3 py-1">
      <span className="h-px flex-1 bg-white/10" />
      <span className="font-mono text-[9px] uppercase tracking-[0.24em] text-white/30">
        {label}
      </span>
      <span className="h-px flex-1 bg-white/10" />
    </div>
  );
}

function DiscordMark() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="relative">
      <path d="M20.317 4.369a19.79 19.79 0 0 0-4.885-1.515.074.074 0 0 0-.078.037 13.78 13.78 0 0 0-.61 1.255 18.27 18.27 0 0 0-5.487 0 12.62 12.62 0 0 0-.617-1.255.077.077 0 0 0-.079-.037A19.74 19.74 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.077.077 0 0 0 .084-.028 14.2 14.2 0 0 0 1.226-1.994.075.075 0 0 0-.041-.105 13.13 13.13 0 0 1-1.872-.892.077.077 0 0 1-.008-.128c.126-.094.252-.192.371-.291a.073.073 0 0 1 .077-.01c3.927 1.793 8.18 1.793 12.062 0a.072.072 0 0 1 .078.01c.12.099.245.197.372.291a.077.077 0 0 1-.006.128c-.598.349-1.22.645-1.873.892a.077.077 0 0 0-.04.106c.36.7.772 1.366 1.226 1.993a.076.076 0 0 0 .083.028 19.84 19.84 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.029ZM8.02 15.331c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.418 2.157-2.418 1.21 0 2.176 1.094 2.157 2.418 0 1.334-.956 2.419-2.157 2.419Zm7.974 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.418 2.157-2.418 1.21 0 2.176 1.094 2.157 2.418 0 1.334-.946 2.419-2.157 2.419Z" />
    </svg>
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
