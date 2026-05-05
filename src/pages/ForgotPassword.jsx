import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, ArrowUpRight, Loader2, CheckCircle2 } from 'lucide-react';
import AuthLayout from '../components/AuthLayout.jsx';
import { Field, ErrorBanner } from './Login.jsx';
import { forgotPassword } from '../utils/api.js';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await forgotPassword(email);
      setSent(true);
    } catch {
      setError('Une erreur est survenue. Réessayez.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title="MOT DE PASSE."
      subtitle="Entrez votre adresse email. Si un compte existe, vous recevrez un lien."
      footer={
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-white/40">
          Vous vous souvenez ?{' '}
          <Link to="/login" className="font-bold text-white transition hover:text-discord">
            Se connecter →
          </Link>
        </p>
      }
    >
      {sent ? (
        <SuccessState email={email} />
      ) : (
        <form onSubmit={handleSubmit} className="space-y-5">
          {error && <ErrorBanner>{error}</ErrorBanner>}

          <Field
            label="Email"
            icon={Mail}
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={setEmail}
            placeholder="you@domain.com"
          />

          <button
            disabled={loading || !email}
            className="group relative mt-2 flex h-12 w-full items-center justify-center gap-2 overflow-hidden rounded-md bg-discord font-mono text-[11px] font-bold uppercase tracking-[0.22em] text-white transition active:scale-[0.99] disabled:opacity-50"
          >
            <span className="absolute inset-0 bg-gradient-to-b from-white/15 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
            {loading ? (
              <Loader2 className="relative h-5 w-5 animate-spin" />
            ) : (
              <>
                <span className="relative">Envoyer le lien</span>
                <ArrowUpRight className="relative h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </>
            )}
          </button>
        </form>
      )}
    </AuthLayout>
  );
}

function SuccessState({ email }) {
  return (
    <div className="space-y-5">
      <div className="flex flex-col items-start gap-3 rounded-md border border-green-500/20 bg-green-500/[0.06] px-4 py-4">
        <CheckCircle2 className="h-5 w-5 text-green-400" />
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-green-200">
            Email envoyé
          </p>
          <p className="mt-1 text-sm text-white/50">
            Si un compte existe pour <span className="text-white/70">{email}</span>, un lien de
            réinitialisation valable <strong className="text-white/70">1 heure</strong> vient d'être
            envoyé.
          </p>
        </div>
      </div>

      <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-white/30">
        Pas reçu ? Vérifiez vos spams ou{' '}
        <button
          onClick={() => window.location.reload()}
          className="font-bold text-white/50 underline-offset-2 hover:text-white"
        >
          réessayez
        </button>
        .
      </p>
    </div>
  );
}
