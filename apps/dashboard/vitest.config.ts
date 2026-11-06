import { defineConfig } from 'vitest/config';
import * as path from 'path';

/**
 * The dashboard's test configuration.
 *
 * The dashboard had **no** test runner: a component could not be rendered
 * and a hook could not be driven, so every screen's behaviour rested on
 * somebody opening it in a browser. This configuration makes both possible:
 *
 *  - `jsdom` — the DOM the components render into;
 *  - the `@/` alias — the same one `tsconfig.json` uses, so a test imports
 *    the component by the path the application imports it by;
 *  - `@fidscript/ui` — the workspace package's **source**, not its build,
 *    so a test exercises the code that is about to ship.
 */
export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
    setupFiles: ['./vitest.setup.ts'],
    // The dashboard's own build is slow; the tests must not be.
    testTimeout: 15000,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@fidscript/ui': path.resolve(__dirname, '../../packages/ui/src/index.ts'),
    },
  },
  esbuild: {
    jsx: 'automatic',
  },
});
