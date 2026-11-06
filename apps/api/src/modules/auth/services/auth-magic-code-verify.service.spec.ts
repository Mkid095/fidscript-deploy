import { AuthMagicCodeVerifyService } from './auth-magic-code-verify.service';

/**
 * The second factor is not optional.
 *
 * The password path asks an MFA-enrolled account for a code before it
 * mints a session. The magic-code path did not — so anybody who could read
 * the mailbox could sign in and skip the second factor entirely.
 */

// The MFA service pulls in `otplib`, which Jest cannot load. The magic-code
// service only ever calls `issueChallenge` on it, so a stand-in is enough.
jest.mock('@/modules/auth/mfa/mfa.service', () => ({
  MfaService: class {},
}));

describe('an account with MFA', () => {
  function makeService(mfaEnabled: boolean) {
    const prisma = {
      user: {
        findUnique: jest.fn(async () => ({ id: 'user-1', email: 'a@b.c', name: null, role: 'USER', mfaEnabled })),
        update: jest.fn(async () => ({})),
      },
      magicCode: {
        findMany: jest.fn(async () => [{
          id: 'code-1',
          // The hash of the code '123456'.
          codeHash: '$2b$10$sA4DWGr7vDk6FkqPC7yFau80S0JTGpRzYJ3KM7UzFLpvLpI9oaH9i',
          expiresAt: new Date(Date.now() + 60000),
          attempts: 0,
        }]),
        update: jest.fn(async () => ({})),
        updateMany: jest.fn(async () => ({})),
      },
    };
    const eventService = { emit: jest.fn(async () => undefined) };
    const session = {
      createSession: jest.fn(async () => ({ id: 'session-1', accessToken: 'a', refreshToken: 'r', expiresIn: 900 })),
      buildAuthResponse: jest.fn(() => ({ accessToken: 'a', refreshToken: 'r', expiresIn: 900 })),
    };
    const mfa = { issueChallenge: jest.fn(() => 'challenge-token') };
    const service = new AuthMagicCodeVerifyService(
      prisma as any, eventService as any, session as any, mfa as any,
    );
    return { service, prisma, session, mfa };
  }

  it('gets a challenge, not a session', async () => {
    const { service, session, mfa } = makeService(true);
    const result: any = await service.verifyCode({ email: 'a@b.c', code: '123456' });
    expect(result.mfaRequired).toBe(true);
    expect(result.mfaToken).toBe('challenge-token');
    expect(mfa.issueChallenge).toHaveBeenCalledWith('user-1');
    expect(session.createSession).not.toHaveBeenCalled();
  });

  it('consumes the code, so the challenge cannot be earned twice', async () => {
    const { service, prisma } = makeService(true);
    await service.verifyCode({ email: 'a@b.c', code: '123456' });
    expect(prisma.magicCode.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'code-1' }, data: expect.objectContaining({ consumed: true }) }),
    );
  });

  it('still signs in an account without MFA', async () => {
    const { service, session } = makeService(false);
    const result: any = await service.verifyCode({ email: 'a@b.c', code: '123456' });
    expect(result.mfaRequired).toBeUndefined();
    expect(session.createSession).toHaveBeenCalled();
  });
});
