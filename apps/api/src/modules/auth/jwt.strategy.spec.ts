import * as jwt from 'jsonwebtoken';
import { JwtStrategy } from './jwt.strategy';
import { AppJwtStrategy } from '@/modules/app-auth/jwt/app-jwt.strategy';

/**
 * The passport hook the rotation list plugs into.
 *
 * passport-jwt 4 has two different options, and they do different things:
 * `secretOrKey` is a **fixed value** — a function passed there is returned
 * as the key itself, never called, and every verification of every token
 * fails. `secretOrKeyProvider(request, rawToken, done)` is the option that
 * resolves a key per request. The strategies must use the provider, or
 * the console cannot sign in at all — which is the regression this pins.
 */

const CURRENT = 'current-secret';
const PREVIOUS = 'previous-secret';

function providerOf(strategy: unknown): (rawToken: string, done: (err: Error | null, secret?: string) => void) => void {
  const s = strategy as unknown as { _secretOrKeyProvider?: (request: unknown, rawToken: string, done: (err: Error | null, secret?: string) => void) => void };
  if (typeof s._secretOrKeyProvider !== 'function') {
    throw new Error('the strategy carries no secretOrKeyProvider — the hook was lost');
  }
  return (token, done) => s._secretOrKeyProvider!(null, token, done);
}

describe('the session strategy resolves its key through secretOrKeyProvider', () => {
  function makeStrategy(secrets: string[]) {
    const verifier = { secrets: () => secrets };
    const accessTokens = { verifyClaims: async () => ({}) };
    return new JwtStrategy(verifier as never, accessTokens as never);
  }

  it('is wired as a provider, not a fixed key', () => {
    expect(() => providerOf(makeStrategy([CURRENT]))).not.toThrow();
  });

  it('hands back the secret the token is actually signed with', () => {
    const strategy = makeStrategy([CURRENT, PREVIOUS]);
    const token = jwt.sign({ sub: 'u1', type: 'access' }, PREVIOUS, { expiresIn: 60 });
    let out: string | null = null;
    providerOf(strategy)(token, (err, secret) => {
      expect(err).toBeNull();
      out = secret ?? null;
    });
    expect(out).toBe(PREVIOUS);
  });

  it('rejects a token signed by nobody on the list', () => {
    const strategy = makeStrategy([CURRENT, PREVIOUS]);
    const token = jwt.sign({ sub: 'u1' }, 'some-other-key', { expiresIn: 60 });
    let out: string | null = null;
    let err: unknown = null;
    providerOf(strategy)(token, (e, secret) => {
      err = e;
      out = secret ?? null;
    });
    expect(err).toBeInstanceOf(Error);
    expect(out).toBeNull();
  });
});

describe('the app-token strategy resolves its key the same way', () => {
  function makeStrategy(secrets: string[]) {
    const verifier = { secrets: () => secrets };
    const prisma = {};
    return new AppJwtStrategy(prisma as never, verifier as never);
  }

  it('hands back the matching secret and refuses the rest', () => {
    const strategy = makeStrategy([CURRENT]);
    const good = jwt.sign({ scope: 'app', type: 'access', sub: 'u1' }, CURRENT, { expiresIn: 60 });
    let secret: string | null = null;
    providerOf(strategy)(good, (err, s) => {
      expect(err).toBeNull();
      secret = s ?? null;
    });
    expect(secret).toBe(CURRENT);

    const bad = jwt.sign({ scope: 'app', type: 'access', sub: 'u1' }, 'not-ours', { expiresIn: 60 });
    let err: unknown = null;
    providerOf(strategy)(bad, (e) => {
      err = e;
    });
    expect(err).toBeInstanceOf(Error);
  });
});
