// `vitest/config` étend defineConfig avec la clé `test` : sans lui, TS la refuse.
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  test: {
    // Un DOM simulé : indispensable pour monter des composants avec RTL.
    environment: 'jsdom',
    setupFiles: ['./src/setup-tests.ts'],
    css: false,
  },
});
