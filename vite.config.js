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
  build: {
    // Lighthouse flagged "missing source maps for large JS" — emit them in
    // prod so debugging and audits get readable stack traces.
    sourcemap: true,
    rollupOptions: {
      output: {
        // Split heavy vendor chunks so the landing page doesn't have to wait
        // on the entire bundle. framer-motion alone is ~70KB gzipped.
        manualChunks: {
          react: ['react', 'react-dom', 'react-router-dom'],
          motion: ['framer-motion'],
        },
      },
    },
  },
});
