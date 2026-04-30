import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, XCircle, Loader2, ArrowRight } from 'lucide-react';
import axios from 'axios';

export default function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  
  const [status, setStatus] = useState('loading'); // loading, success, error
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('Lien de vérification invalide ou manquant.');
      return;
    }

    const verify = async () => {
      try {
        const { data } = await axios.post('/api/auth/verify-email', { token });
        if (data.success) {
          setStatus('success');
        } else {
          setStatus('error');
          setMessage(data.error || 'La vérification a échoué.');
        }
      } catch (err) {
        setStatus('error');
        setMessage(err.response?.data?.error || 'Une erreur est survenue lors de la vérification.');
      }
    };

    verify();
  }, [token]);

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-[#050505] text-white overflow-hidden px-6">
      <AnimatedBackground />

      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 w-full max-w-md"
      >
        <div className="rounded-3xl border border-white/5 bg-white/[0.02] p-8 md:p-12 backdrop-blur-xl shadow-2xl">
          <div className="mb-8 flex justify-center">
            <AnimatePresence mode="wait">
              {status === 'loading' && (
                <motion.div
                  key="loading"
                  initial={{ opacity: 0, rotate: -180 }}
                  animate={{ opacity: 1, rotate: 0 }}
                  exit={{ opacity: 0, scale: 0.5 }}
                >
                  <Loader2 className="h-16 w-16 text-white/20 animate-spin" />
                </motion.div>
              )}
              {status === 'success' && (
                <motion.div
                  key="success"
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="rounded-full bg-green-500/10 p-4"
                >
                  <CheckCircle2 className="h-16 w-16 text-green-500" />
                </motion.div>
              )}
              {status === 'error' && (
                <motion.div
                  key="error"
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="rounded-full bg-red-500/10 p-4"
                >
                  <XCircle className="h-16 w-16 text-red-500" />
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="text-center">
            <h1 className="text-3xl font-black tracking-tight mb-4" style={{ fontFamily: 'Bebas Neue' }}>
              {status === 'loading' ? 'Vérification...' : 
               status === 'success' ? 'Email vérifié !' : 'Oups !'}
            </h1>
            
            <p className="text-white/50 text-sm leading-relaxed mb-10">
              {status === 'loading' ? 'Nous confirmons votre adresse email pour activer votre compte.' : 
               status === 'success' ? 'Votre compte est maintenant actif. Vous pouvez commencer à créer votre profil unique.' : 
               message}
            </p>

            {status === 'success' ? (
              <Link
                to="/editor"
                className="group flex items-center justify-center gap-2 w-full bg-white text-black font-bold py-4 rounded-2xl transition-all hover:bg-white/90 active:scale-95 shadow-xl shadow-white/5"
              >
                Accéder à l'éditeur
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
            ) : status === 'error' ? (
              <Link
                to="/login"
                className="inline-block text-sm font-mono uppercase tracking-[0.2em] text-white/40 hover:text-white transition-colors"
              >
                Retour à la connexion
              </Link>
            ) : null}
          </div>
        </div>
      </motion.div>
    </div>
  );
}

function AnimatedBackground() {
  return (
    <div className="fixed inset-0 z-0">
      <motion.div
        animate={{
          scale: [1, 1.3, 1],
          opacity: [0.2, 0.4, 0.2],
          x: [-50, 50, -50],
          y: [-20, 20, -20],
        }}
        transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
        className="absolute -left-[10%] -top-[10%] h-[70%] w-[70%] rounded-full bg-[#5865F2]/10 blur-[120px]"
      />
      <motion.div
        animate={{
          scale: [1.3, 1, 1.3],
          opacity: [0.1, 0.3, 0.1],
          x: [50, -50, 50],
          y: [20, -20, 20],
        }}
        transition={{ duration: 18, repeat: Infinity, ease: "linear" }}
        className="absolute -right-[10%] -bottom-[10%] h-[70%] w-[70%] rounded-full bg-purple-500/5 blur-[120px]"
      />
      <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.02] pointer-events-none" />
    </div>
  );
}
