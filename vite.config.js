import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * Vite config.
 *
 * In dev we proxy `/api` to the Express server (port 3001) so the SPA and the
 * API live on the SAME origin from the browser's point of view. This makes
 * the auth cookie "just work" (it's set on `localhost:5173` — where our app
 * is served) and matches the production setup where Express serves both
 * static assets and the API from a single origin.
 */
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true,
    proxy: {
      '/api': {
        target: `http://localhost:${process.env.PORT || 3001}`,
        changeOrigin: true,
        secure: false,
      },
    },
  },
});
