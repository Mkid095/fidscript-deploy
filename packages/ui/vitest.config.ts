import { defineConfig } from 'vitest/config';

/**
 * The shared components' own tests.
 *
 * They run in jsdom, because a component's behaviour is mostly about what
 * it does to the document: the focus it takes, the name it gives a control,
 * the state it announces.
 */
export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
    setupFiles: ['./vitest.setup.ts'],
  },
  esbuild: {
    jsx: 'automatic',
  },
});
