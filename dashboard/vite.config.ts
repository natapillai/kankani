import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// During dev, the Vite server proxies /api/* to the kankani dashboard server
// (default 127.0.0.1:9100). In production the built UI ships inside the
// library's dist/ui/ and is served by the kankani server itself, same-origin,
// so no proxy is involved.
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
    outDir: '../dist/ui',
    emptyOutDir: true,
  },
});
