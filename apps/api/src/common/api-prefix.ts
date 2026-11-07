/**
 * The prefix every route is served under.
 *
 * It is set once, in `main.ts`, and read by the contract tests — so a
 * change to the prefix cannot leave the tests checking a URL the platform
 * does not serve.
 */
export const API_PREFIX = 'api/v1';
