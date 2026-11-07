import { UnauthorizedException } from '@nestjs/common';
import { AccessTokenService } from './access-token.service';

/**
 * What a bearer token has to prove, tested.
 *
 * The composite API-key/JWT guard used to check the SIGNATURE and nothing
 * else, while the session strategy checked the token's type, its session and
 * its revocation list. So a refresh token — seven days long — presented as a
 * bearer token authenticated as the user on every route the guard covered,
 * and it survived logout.
 */

const USER_ID = 'user-1';
const SESSION_ID = 'session-1';

function makeService(options: {
  revoked?: boolean;
  sessionExpiresAt?: Date | null;
  user?: { id: string; email: string; role: string; emailVerifiedAt: Date | null } | null;
  verifyThrows?: boolean;
} = {}) {
  const prisma = {
    user: {
      findUnique: jest.fn(async () =>
        options.user === undefined
          ? { id: USER_ID, email: 'a@b.c', role: 'ADMIN', emailVerifiedAt: null }
          : options.user,
      ),
    },
    session: {
      findUnique: jest.fn(async () => {
        if (options.sessionExpiresAt === null) return null;
        return { expiresAt: options.sessionExpiresAt ?? new Date(Date.now() + 60_000) };
      }),
    },
  };
  const blocklist = {
    isRevoked: jest.fn(async () => options.revoked ?? false),
  };
  const jwt = {
    verifyAsync: jest.fn(async () => {
      if (options.verifyThrows) throw new Error('bad signature');
      return { sub: USER_ID, email: 'a@b.c', role: 'ADMIN', type: 'access', sessionId: SESSION_ID };
    }),
  };
  return {
    service: new AccessTokenService(prisma as any, jwt as any, blocklist as any),
    prisma,
    blocklist,
  };
}

describe('AccessTokenService', () => {
  it('accepts a live access token and resolves its caller', async () => {
    const { service } = makeService();
    const caller = await service.verify('a.b.c');
    expect(caller.userId).toBe(USER_ID);
    expect(caller.role).toBe('ADMIN');
  });

  it('refuses a token whose signature does not verify', async () => {
    const { service } = makeService({ verifyThrows: true });
    await expect(service.verify('a.b.c')).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('refuses a REFRESH token — it is not a credential for the API', async () => {
    const { service, prisma } = makeService();
    // The same service, but the token says it is a refresh token.
    const jwt = { verifyAsync: jest.fn(async () => ({ sub: USER_ID, type: 'refresh', sessionId: SESSION_ID })) };
    const svc = new AccessTokenService(prisma as any, jwt as any, { isRevoked: async () => false } as any);
    await expect(svc.verify('a.b.c')).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('refuses a token whose session has been revoked', async () => {
    const { service } = makeService({ revoked: true });
    await expect(service.verify('a.b.c')).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('refuses a token whose session has expired', async () => {
    const { service } = makeService({ sessionExpiresAt: new Date(Date.now() - 1000) });
    await expect(service.verify('a.b.c')).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('refuses a token whose session row is gone', async () => {
    const { service } = makeService({ sessionExpiresAt: null });
    await expect(service.verify('a.b.c')).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('refuses a token that names no user', async () => {
    const { service } = makeService({ user: null });
    await expect(service.verify('a.b.c')).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('checks the revocation list before it touches the database', async () => {
    const { service, prisma } = makeService({ revoked: true });
    await expect(service.verify('a.b.c')).rejects.toBeInstanceOf(UnauthorizedException);
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
  });
});
