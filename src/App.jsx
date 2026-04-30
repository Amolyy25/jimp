import { Navigate, Route, Routes } from 'react-router-dom';
import Landing from './pages/Landing.jsx';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import Editor from './pages/Editor.jsx';
import View from './pages/View.jsx';
import Analytique from './pages/Analytique.jsx';
import Explore from './pages/Explore.jsx';
import Clicker from './pages/Clicker.jsx';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/editor" element={<Editor />} />
      <Route path="/analytique" element={<Analytique />} />
      <Route path="/explore" element={<Explore />} />
      <Route path="/clicker" element={<Clicker />} />
      <Route path="/view" element={<View />} />
      <Route path="/:slug" element={<View />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
