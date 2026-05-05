import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Lock, ArrowUpRight, Loader2, CheckCircle2, Eye, EyeOff } from 'lucide-react';
import AuthLayout from '../components/AuthLayout.jsx';
import { Field, ErrorBanner } from './Login.jsx';
import { resetPassword } from '../utils/api.js';

export default function ResetPassword() {
  const [params] = useSearchParams();
  const token = params.get('token') || '';

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [revealPw, setRevealPw] = useState(false);
  const [revealConfirm, setRevealConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  if (!token) {
    return (
      <AuthLayout title="ERREUR." subtitle="">
        <div className="space-y-5">
          <ErrorBanner>Lien invalide ou manquant.</ErrorBanner>
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-white/40">
            <Link to="/forgot" className="font-bold text-white transition hover:text-discord">
              Demander un nouveau lien →
            </Link>
          </p>
        </div>
      </AuthLayout>
    );
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password !== confirm) {
      setError('Les mots de passe ne correspondent pas.');
      return;
    }
    if (password.length < 8) {
      setError('Le mot de passe doit contenir au moins 8 caractères.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await resetPassword(token, password);
      setDone(true);
    } catch (err) {
      const msg = err.response?.data?.error || 'Une erreur est survenue.';
      if (msg === 'Lien invalide ou expiré') {
        setError('Ce lien est invalide ou a expiré. Demandez un nouveau lien.');
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title="NOUVEAU MDP."
      subtitle="Choisissez un nouveau mot de passe pour votre compte persn.me."
      footer={
        done ? null : (
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-white/40">
            <Link to="/login" className="font-bold text-white transition hover:text-discord">
              ← Retour à la connexion
            </Link>
          </p>
        )
      }
    >
      {done ? (
        <SuccessState />
      ) : (
        <form onSubmit={handleSubmit} className="space-y-5">
          {error && <ErrorBanner>{error}</ErrorBanner>}

          <Field
            label="Nouveau mot de passe"
            icon={Lock}
            type={revealPw ? 'text' : 'password'}
            autoComplete="new-password"
            required
            value={password}
            onChange={setPassword}
            placeholder="••••••••"
            hint="8 caractères minimum"
            maxLength={128}
            trailing={
              <button
                type="button"
                onClick={() => setRevealPw((v) => !v)}
                className="flex h-7 w-7 items-center justify-center rounded-md text-white/40 transition hover:bg-white/5 hover:text-white"
                aria-label={revealPw ? 'Masquer' : 'Afficher'}
              >
                {revealPw ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
              </button>
            }
          />

          <Field
            label="Confirmer le mot de passe"
            icon={Lock}
            type={revealConfirm ? 'text' : 'password'}
            autoComplete="new-password"
            required
            value={confirm}
            onChange={setConfirm}
            placeholder="••••••••"
            maxLength={128}
            trailing={
              <button
                type="button"
                onClick={() => setRevealConfirm((v) => !v)}
                className="flex h-7 w-7 items-center justify-center rounded-md text-white/40 transition hover:bg-white/5 hover:text-white"
                aria-label={revealConfirm ? 'Masquer' : 'Afficher'}
              >
                {revealConfirm ? (
                  <EyeOff className="h-3.5 w-3.5" />
                ) : (
                  <Eye className="h-3.5 w-3.5" />
                )}
              </button>
            }
          />

          <button
            disabled={loading || !password || !confirm}
            className="group relative mt-2 flex h-12 w-full items-center justify-center gap-2 overflow-hidden rounded-md bg-discord font-mono text-[11px] font-bold uppercase tracking-[0.22em] text-white transition active:scale-[0.99] disabled:opacity-50"
          >
            <span className="absolute inset-0 bg-gradient-to-b from-white/15 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
            {loading ? (
              <Loader2 className="relative h-5 w-5 animate-spin" />
            ) : (
              <>
                <span className="relative">Mettre à jour</span>
                <ArrowUpRight className="relative h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </>
            )}
          </button>
        </form>
      )}
    </AuthLayout>
  );
}

function SuccessState() {
  return (
    <div className="space-y-5">
      <div className="flex flex-col items-start gap-3 rounded-md border border-green-500/20 bg-green-500/[0.06] px-4 py-4">
        <CheckCircle2 className="h-5 w-5 text-green-400" />
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-green-200">
            Mot de passe mis à jour
          </p>
          <p className="mt-1 text-sm text-white/50">
            Votre nouveau mot de passe est actif. Vous pouvez maintenant vous connecter.
          </p>
        </div>
      </div>
      <Link
        to="/login"
        className="group relative flex h-12 w-full items-center justify-center gap-2 overflow-hidden rounded-md bg-discord font-mono text-[11px] font-bold uppercase tracking-[0.22em] text-white transition active:scale-[0.99]"
      >
        <span className="absolute inset-0 bg-gradient-to-b from-white/15 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
        <span className="relative">Se connecter</span>
        <ArrowUpRight className="relative h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
      </Link>
    </div>
  );
}
