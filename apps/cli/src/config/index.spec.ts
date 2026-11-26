import { describe, it, expect } from 'vitest';
import { resolveApiKey, type CliCredentials } from './index';

/**
 * The one-token model, at the seam: a v2 named key chosen by `activeKey`
 * wins; otherwise a v1 raw key; otherwise nothing. This is what every
 * command authenticates with, so the resolution order is the contract.
 */
describe('resolveApiKey', () => {
  it('prefers the active named key', () => {
    const creds: CliCredentials = {
      keys: { a: 'fsk_A', b: 'fsk_B' },
      activeKey: 'b',
      apiKey: 'fsk_RAW',
    };
    expect(resolveApiKey(creds)).toBe('fsk_B');
  });

  it('falls back to the raw key when there is no active named key', () => {
    const creds: CliCredentials = { keys: { a: 'fsk_A' }, activeKey: 'nope', apiKey: 'fsk_RAW' };
    expect(resolveApiKey(creds)).toBe('fsk_RAW');
  });

  it('returns the raw key when no keys are named', () => {
    expect(resolveApiKey({ apiKey: 'fsk_RAW' })).toBe('fsk_RAW');
  });

  it('returns nothing when there is nothing stored', () => {
    expect(resolveApiKey({})).toBeUndefined();
  });

  it('an empty activeKey does not shadow a raw key', () => {
    expect(resolveApiKey({ keys: {}, activeKey: '', apiKey: 'fsk_RAW' })).toBe('fsk_RAW');
  });
});
