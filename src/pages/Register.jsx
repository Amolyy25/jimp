import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, ArrowUpRight, Loader2, AtSign, Eye, EyeOff, Check } from 'lucide-react';
import AuthLayout from '../components/AuthLayout.jsx';
import { Field, ErrorBanner, DiscordButton, Divider } from './Login.jsx';
import { register } from '../utils/api.js';

export default function Register() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [revealPw, setRevealPw] = useState(false);
  const [formData, setFormData] = useState({ username: '', email: '', password: '' });

  const strength = useMemo(() => scorePassword(formData.password), [formData.password]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await register(formData.username, formData.email, formData.password);
      navigate('/editor');
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title="CREATE YOURS."
      subtitle="One account. One URL. Yours for keeps. Claim a slug, lock it in, ship it."
      footer={
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-white/40">
          Already in?{' '}
          <Link to="/login" className="font-bold text-white transition hover:text-discord">
            Sign in →
          </Link>
        </p>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {error && <ErrorBanner>{error}</ErrorBanner>}

        <DiscordButton label="Sign up with Discord" />
        <Divider />

        <Field
          label="Username"
          icon={AtSign}
          value={formData.username}
          onChange={(v) => setFormData({ ...formData, username: v.replace(/\s/g, '') })}
          placeholder="yourhandle"
          autoComplete="username"
          required
          maxLength={24}
          hint="Letters, numbers, dashes. Stays public."
        />

        <Field
          label="Email"
          icon={Mail}
          type="email"
          value={formData.email}
          onChange={(v) => setFormData({ ...formData, email: v })}
          placeholder="you@domain.com"
          autoComplete="email"
          required
        />

        <div className="space-y-2">
          <Field
            label="Password"
            icon={Lock}
            type={revealPw ? 'text' : 'password'}
            value={formData.password}
            onChange={(v) => setFormData({ ...formData, password: v })}
            placeholder="••••••••"
            autoComplete="new-password"
            required
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
          />
          <PasswordStrength score={strength} />
        </div>

        <button
          disabled={loading || strength < 2 || !formData.username || !formData.email}
          className="group relative mt-2 flex h-12 w-full items-center justify-center gap-2 overflow-hidden rounded-md bg-discord font-mono text-[11px] font-bold uppercase tracking-[0.22em] text-white transition active:scale-[0.99] disabled:opacity-40 disabled:grayscale"
        >
          <span className="absolute inset-0 bg-gradient-to-b from-white/15 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
          {loading ? (
            <Loader2 className="relative h-5 w-5 animate-spin" />
          ) : (
            <>
              <span className="relative">Create account</span>
              <ArrowUpRight className="relative h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </>
          )}
        </button>

        <p className="pt-2 text-center font-mono text-[9px] uppercase tracking-[0.22em] leading-relaxed text-white/25">
          By creating an account you agree to our
          <br />
          <a href="#" className="transition hover:text-discord">
            Terms
          </a>{' '}
          · <a href="#" className="transition hover:text-discord">Privacy</a>
        </p>
      </form>
    </AuthLayout>
  );
}

/* -------------------------------------------------------------------------- */
/* Password strength meter                                                     */
/* -------------------------------------------------------------------------- */

function PasswordStrength({ score }) {
  const labels = ['Too short', 'Weak', 'Ok', 'Strong', 'Iron'];
  const colors = [
    'bg-white/10',
    'bg-red-400/70',
    'bg-amber-400/70',
    'bg-sky-400/70',
    'bg-green-400/80',
  ];

  return (
    <div className="space-y-1.5">
      <div className="flex gap-1">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className={`h-0.5 flex-1 rounded-full transition-colors ${
              i < score ? colors[score] : 'bg-white/5'
            }`}
          />
        ))}
      </div>
      <div className="flex items-center justify-between pl-1">
        <span className="font-mono text-[9px] uppercase tracking-[0.24em] text-white/40">
          Strength
        </span>
        <span
          className={[
            'flex items-center gap-1 font-mono text-[9px] uppercase tracking-[0.22em]',
            score >= 3 ? 'text-green-300' : score >= 2 ? 'text-amber-300' : 'text-white/40',
          ].join(' ')}
        >
          {score >= 3 && <Check className="h-3 w-3" />}
          {labels[score]}
        </span>
      </div>
    </div>
  );
}

/**
 * Tiny heuristic password scorer — not a security tool, just UX feedback.
 * 0 = too short, 1 = weak, 2 = ok, 3 = strong, 4 = iron.
 */
function scorePassword(pw) {
  if (!pw || pw.length < 8) return 0;
  let score = 1;
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) score += 1;
  if (/\d/.test(pw)) score += 1;
  if (/[^\w\s]/.test(pw) && pw.length >= 12) score += 1;
  return Math.min(score, 4);
}
