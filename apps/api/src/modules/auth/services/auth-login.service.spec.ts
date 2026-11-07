import { UnauthorizedException, HttpException } from '@nestjs/common';
import { Test } from '@nestjs/testing';

import { AuthLoginService } from './auth-login.service';

/**
 * Signing in must not say who has an account.
 *
 * It used to answer "this account uses magic code login" for an account
 * that existed — before the password was even looked at. And the lockout
 * only ever applied to addresses that HAD an account, so twenty tries told
 * you whether the address was real.
 *
 * Every failure now answers the same way, and the counter is keyed on the
 * address that was typed.
 */
describe('AuthLoginService', () => {
  let service: AuthLoginService;
  let prisma: any;
  let rateLimiter: { consume: jest.Mock; count: jest.Mock };

  const account = {
    id: 'user-1',
    email: 'operator@fidscript.com',
    name: 'Operator',
    role: 'ADMIN',
    passwordHash: 'hash',
    preferredAuthMethod: 'MAGIC_CODE',
  };

  beforeEach(async () => {
    prisma = {
      user: { findUnique: jest.fn(async () => ({ ...account })) },
      userCredential: { findFirst: jest.fn(async () => null) },
      session: { update: jest.fn(async () => ({})) },
    };
    rateLimiter = {
      consume: jest.fn(async () => ({ allowed: true, count: 1, retryAfter: 0 })),
      count: jest.fn(async () => 0),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        AuthLoginService,
        { provide: require('@/prisma/prisma.service').PrismaService, useValue: prisma },
        { provide: require('@/modules/events/event.service').EventService, useValue: { emit: jest.fn() } },
        { provide: require('@/common/auth-rate-limiter.service').AuthRateLimiter, useValue: rateLimiter },
        { provide: require('@/modules/auth/mfa/mfa-challenge.service').MfaChallengeService, useValue: { issueChallenge: jest.fn() } },
        { provide: require('@/common/jwt-blocklist.service').JwtBlocklistService, useValue: { revoke: jest.fn() } },
      ],
    }).compile();

    service = moduleRef.get(AuthLoginService);
  });

  async function messageFor(email: string): Promise<string> {
    try {
      await service.login({ email, password: 'whatever' });
      return 'signed in';
    } catch (err) {
      return (err as Error).message;
    }
  }

  it('says the same thing for an account that does not exist', async () => {
    prisma.user.findUnique.mockResolvedValueOnce(null);
    const unknown = await messageFor('nobody@fidscript.com');

    const magicCodeAccount = await messageFor('operator@fidscript.com');

    expect(magicCodeAccount).toBe(unknown);
    expect(magicCodeAccount).toBe('Invalid credentials');
  });

  it('counts the attempts for an address that does not exist too', async () => {
    prisma.user.findUnique.mockResolvedValueOnce(null);
    await messageFor('nobody@fidscript.com');
    expect(rateLimiter.consume).toHaveBeenCalled();
  });

  it('locks an unknown address out the same way it locks a real one', async () => {
    rateLimiter.count.mockResolvedValue(99);
    prisma.user.findUnique.mockResolvedValueOnce(null);
    const unknown = await messageFor('nobody@fidscript.com');

    const real = await messageFor('operator@fidscript.com');

    expect(real).toBe(unknown);
    expect(real).toContain('Too many attempts');
  });

  it('says the same thing when the password is wrong', async () => {
    prisma.user.findUnique.mockResolvedValueOnce({ ...account, preferredAuthMethod: 'PASSWORD' });
    const bcrypt = require('bcrypt');
    jest.spyOn(bcrypt, 'compare').mockResolvedValueOnce(false as never);
    expect(await messageFor('operator@fidscript.com')).toBe('Invalid credentials');
  });

  it('still refuses an unknown address', async () => {
    prisma.user.findUnique.mockResolvedValueOnce(null);
    await expect(service.login({ email: 'nobody@fidscript.com', password: 'x' })).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });
});
