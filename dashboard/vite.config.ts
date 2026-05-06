import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// During dev, the Vite server proxies /api/* to the kankani dashboard server
// (default 127.0.0.1:9100). In production the built UI is served by the same
// kankani server, so /api/* is same-origin and no proxy is involved.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:9100',
        changeOrigin: false,
      },
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
});
