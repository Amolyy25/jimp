import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import Landing from './pages/Landing.jsx';

// Every other route is lazy-loaded so the landing page bundle stays small.
// Without this, Editor/View/etc. (~80 KiB minified) ship on first paint for
// visitors who'll never click into them.
const Login = lazy(() => import('./pages/Login.jsx'));
const Register = lazy(() => import('./pages/Register.jsx'));
const Editor = lazy(() => import('./pages/Editor.jsx'));
const View = lazy(() => import('./pages/View.jsx'));
const Analytique = lazy(() => import('./pages/Analytique.jsx'));
const Explore = lazy(() => import('./pages/Explore.jsx'));
const Clicker = lazy(() => import('./pages/Clicker.jsx'));
const VerifyEmail = lazy(() => import('./pages/VerifyEmail.jsx'));
const ForgotPassword = lazy(() => import('./pages/ForgotPassword.jsx'));
const ResetPassword = lazy(() => import('./pages/ResetPassword.jsx'));

export default function App() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#050505]" />}>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/editor" element={<Editor />} />
        <Route path="/analytique" element={<Analytique />} />
        <Route path="/explore" element={<Explore />} />
        <Route path="/clicker" element={<Clicker />} />
        <Route path="/verify-email" element={<VerifyEmail />} />
        <Route path="/forgot" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/view" element={<View />} />
        <Route path="/:slug" element={<View />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}
