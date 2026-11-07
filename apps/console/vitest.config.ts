import { defineConfig } from 'vitest/config';
import * as path from 'path';

export default defineConfig({
  // The project's PostCSS config is Tailwind's, which Vite's PostCSS loader
  // cannot use — the tests do not need the styles, and the config is not
  // read at all.
  css: {
    postcss: { plugins: [] },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
    setupFiles: ['./vitest.setup.ts'],
    // The project's PostCSS config is Tailwind's, which Vite's PostCSS loader
    // cannot use. The tests do not need the styles.
    css: false,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  esbuild: {
    jsx: 'automatic',
  },
});
