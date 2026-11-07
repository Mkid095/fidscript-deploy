import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CloudflareOAuthService } from './cloudflare-oauth.service';

/**
 * The OAuth state, tested.
 *
 * The callback used to compare the client's copy of the state with
 * ITSELF — the same value was passed as both the expected and the actual
 * state — so the check could never fail. Any state, and any project id,
 * was accepted, and the endpoint replaced that project's Cloudflare
 * connection with the caller's account.
 */

const ENCRYPTION_KEY = Buffer.alloc(32, 7).toString('base64');

function makeService() {
  const config = {
    get: jest.fn((key: string, fallback: string) => {
      if (key === 'ENCRYPTION_KEY') return ENCRYPTION_KEY;
      return fallback;
    }),
  } as unknown as ConfigService;

  return new CloudflareOAuthService(
    config,
    { domainConnection: { deleteMany: jest.fn(), create: jest.fn() } } as any,
    {} as any,
  );
}

describe('the Cloudflare OAuth state', () => {
  it('carries the project and the person it was issued for', () => {
    const service = makeService();
    const state = service.createState('project-a', 'user-a');
    expect(service.verifyState(state)).toEqual({ projectId: 'project-a', userId: 'user-a' });
  });

  it('is not a bare random string — it is signed', () => {
    const service = makeService();
    const state = service.createState('project-a', 'user-a');
    expect(state.split('.')).toHaveLength(2);
  });

  it('refuses a state the platform did not issue', () => {
    const service = makeService();
    expect(() => service.verifyState('forged.forged')).toThrow(UnauthorizedException);
  });

  it('refuses a state whose body was tampered with', () => {
    const service = makeService();
    const state = service.createState('project-a', 'user-a');
    const [body, signature] = state.split('.');
    const tampered = Buffer.from(
      JSON.stringify({ projectId: 'project-victim', userId: 'attacker', exp: Date.now() + 60_000 }),
      'utf8',
    ).toString('base64url');
    expect(() => service.verifyState(`${tampered}.${signature}`)).toThrow(UnauthorizedException);
    expect(() => service.verifyState(`${body}.${signature}`)).not.toThrow();
  });

  it('refuses an expired state', () => {
    const service = makeService();
    const state = service.createState('project-a', 'user-a');
    jest.useFakeTimers();
    jest.setSystemTime(Date.now() + 11 * 60 * 1000);
    expect(() => service.verifyState(state)).toThrow(UnauthorizedException);
    jest.useRealTimers();
  });

  it('refuses an empty state', () => {
    const service = makeService();
    expect(() => service.verifyState('')).toThrow(UnauthorizedException);
  });
});
