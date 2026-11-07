/**
 * Jest configuration for the API.
 *
 * The suite was declared (`jest --passWithNoTests`) but had **no configuration
 * and no test files**: jest's default transform is babel-jest, which cannot
 * parse TypeScript, and the `@/*` alias every source file uses was
 * unresolvable. The CI job that ran it passed with zero tests.
 *
 * This configuration is what makes a test possible:
 *   - `ts-jest` compiles the TypeScript the way the build does;
 *   - `reflect-metadata` provides the `Reflect.metadata` that every
 *     `@Injectable()` / `@Inject()` decorator calls;
 *   - `moduleNameMapper` resolves the `@/*` alias;
 *   - `roots` keeps jest inside `src`, and the e2e tier (which needs a live
 *     Postgres) is excluded by default.
 */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  rootDir: '.',
  roots: ['<rootDir>/src'],
  moduleFileExtensions: ['ts', 'js', 'json'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  setupFiles: ['reflect-metadata'],
  transform: {
    '^.+\\.ts$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.json' }],
    // A few dependencies ship ESM only — `otplib` (the TOTP library behind
    // MFA) and the `@scure` packages it uses. Jest runs the tests as
    // CommonJS, so those are transformed rather than skipped: the real
    // implementation, not a stub.
    '^.+\\.jsx?$': ['ts-jest', { tsconfig: { allowJs: true, module: 'commonjs', target: 'es2020' } }],
  },
  // A test that fails to compile is a failure, not a silent skip.
  testMatch: ['**/*.spec.ts'],
  // `otplib` (the TOTP library behind MFA) ships ESM only. Jest runs the
  // tests as CommonJS, so those packages are transformed instead of being
  // skipped — the real implementation, not a stub.
  transformIgnorePatterns: [
    'node_modules/(?!(?:\\.pnpm/)?(?:otplib|@otplib|@scure|@noble))',
  ],
  testPathIgnorePatterns: ['\\.e2e-spec\\.ts$', '/node_modules/'],
  collectCoverageFrom: ['src/**/*.ts', '!src/**/*.module.ts', '!src/main.ts'],
  coverageDirectory: '../coverage',
};
