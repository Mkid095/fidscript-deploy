import * as jwt from 'jsonwebtoken';
import { JwtTokenVerifier } from './jwt-token-verifier.service';
import { resolveJwtSecrets } from './secrets';

function configWith(overrides: Record<string, string | undefined>) {
  return { get: (k: string) => overrides[k] } as never;
}

const CURRENT = 'current-signing-secret';
const PREVIOUS = 'previous-secret-being-retired';

/**
 * Rotating the signing secret without logging anybody out.
 *
 * New tokens are signed with the current secret only. Tokens verify
 * against the whole rotation list, so a token minted before the rotation
 * keeps working until its own expiry — and a token signed by neither key
 * is refused.
 */
describe('the rotation secret list', () => {
  it('is just the current secret when no previous is set', () => {
    expect(resolveJwtSecrets(configWith({ JWT_SECRET: CURRENT }))).toEqual([CURRENT]);
  });

  it('reads the previous from the environment or its file', () => {
    expect(
      resolveJwtSecrets(configWith({ JWT_SECRET: CURRENT, JWT_SECRET_PREV: PREVIOUS })),
    ).toEqual([CURRENT, PREVIOUS]);
  });

  it('drops a previous that is the current, or the unfilled placeholder', () => {
    expect(resolveJwtSecrets(configWith({ JWT_SECRET: CURRENT, JWT_SECRET_PREV: CURRENT })))
      .toEqual([CURRENT]);
    expect(resolveJwtSecrets(configWith({ JWT_SECRET: CURRENT, JWT_SECRET_PREV: 'change-me' })))
      .toEqual([CURRENT]);
  });

  it('keeps the current first, so it is tried and signed with first', () => {
    const list = resolveJwtSecrets(configWith({ JWT_SECRET: CURRENT, JWT_SECRET_PREV: PREVIOUS }));
    expect(list[0]).toBe(CURRENT);
  });

  it('fails closed when the current secret is the placeholder', () => {
    expect(() =>
      resolveJwtSecrets(configWith({ JWT_SECRET: 'change-me' })),
    ).toThrow(/JWT_SECRET/);
  });
});

describe('verifying against the rotation list', () => {
  function makeVerifier(env: Record<string, string | undefined>) {
    return new JwtTokenVerifier(configWith(env));
  }

  it('accepts a token the current secret signed', () => {
    const token = jwt.sign({ sub: 'u1', type: 'access' }, CURRENT, { expiresIn: 60 });
    const payload = makeVerifier({ JWT_SECRET: CURRENT }).verify(token);
    expect(payload.sub).toBe('u1');
  });

  it('still accepts a token the retiring secret signed, during the window', () => {
    const token = jwt.sign({ sub: 'u1', type: 'access' }, PREVIOUS, { expiresIn: 60 });
    const payload = makeVerifier({
      JWT_SECRET: CURRENT,
      JWT_SECRET_PREV: PREVIOUS,
    }).verify(token);
    expect(payload.sub).toBe('u1');
  });

  it('rejects the retiring token once the window is closed', () => {
    const token = jwt.sign({ sub: 'u1', type: 'access' }, PREVIOUS, { expiresIn: 60 });
    expect(() => makeVerifier({ JWT_SECRET: CURRENT }).verify(token)).toThrow(
      /Invalid token signature/,
    );
  });

  it('rejects a token signed by nobody it knows', () => {
    const token = jwt.sign({ sub: 'u1' }, 'a-seizure-of-a-different-key', { expiresIn: 60 });
    expect(() =>
      makeVerifier({ JWT_SECRET: CURRENT, JWT_SECRET_PREV: PREVIOUS }).verify(token),
    ).toThrow(/Invalid token signature/);
  });

  it('reports an expired token as expired, not as a bad signature', () => {
    const token = jwt.sign({ sub: 'u1' }, CURRENT, { expiresIn: -1 });
    expect(() => makeVerifier({ JWT_SECRET: CURRENT }).verify(token)).toThrow(/expired/i);
  });
});
