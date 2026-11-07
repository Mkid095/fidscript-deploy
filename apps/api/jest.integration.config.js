/**
 * The integration tier.
 *
 * The unit tier (`jest.config.js`) runs the pure logic: a service with a
 * mocked database, a guard with a mocked request. This tier runs the
 * **application** — the real controllers, the real guards, the real
 * services — against a database of its own, over HTTP.
 *
 * It is a separate configuration because it needs a database and a
 * platform's network, and a developer without those should still be able
 * to run the unit tier.
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
  setupFiles: ['reflect-metadata', '<rootDir>/src/testing/setup-env.ts'],
  transform: {
    '^.+\\.ts$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.json' }],
    '^.+\\.jsx?$': ['ts-jest', { tsconfig: { allowJs: true, module: 'commonjs', target: 'es2020' } }],
  },
  transformIgnorePatterns: [
    'node_modules/(?!(?:\\.pnpm/)?(?:otplib|@otplib|@scure|@noble))',
  ],
  testMatch: ['**/*.integration-spec.ts'],
  // Booting the platform and migrating a database takes longer than a
  // unit test does.
  testTimeout: 120000,
  maxWorkers: 1,
  collectCoverageFrom: ['src/**/*.ts', '!src/**/*.module.ts', '!src/main.ts'],
  coverageDirectory: '../coverage',
};
