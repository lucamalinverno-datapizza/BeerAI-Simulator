import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// Static, offline build: relative base so dist/ can be served from any local folder.
export default defineConfig({
  base: './',
  plugins: [react()],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: false,
    chunkSizeWarningLimit: 2000,
    assetsInlineLimit: 0,
  },
  worker: {
    format: 'es',
  },
  server: {
    host: '127.0.0.1',
  },
  preview: {
    host: '127.0.0.1',
  },
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
  },
});
