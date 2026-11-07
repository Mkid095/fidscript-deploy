import { UnauthorizedException, HttpException } from '@nestjs/common';
import { Test } from '@nestjs/testing';

import { MfaChallengeService } from './mfa-challenge.service';
import { MfaRecoveryCodeService } from './mfa-recovery-code.service';

// The real TOTP arithmetic needs a real secret and the real clock. What is
// being checked here is the RULES around it, so the code check is a stub.
jest.mock('otplib', () => ({
  verifySync: jest.fn(() => ({ valid: true })),
}));

/**
 * The challenge: a window into a million-code space. It counts its
 * attempts, it never puts the challenge token in a Redis key, and a recovery
 * code is used up the moment it works.
 */
describe('MfaChallengeService', () => {
  let service: MfaChallengeService;
  let prisma: any;
  let rateLimiter: any;
  let jwtService: any;
  let recoveryCodes: { consume: jest.Mock };

  const user = {
    id: 'user-1',
    email: 'operator@fidscript.com',
    name: 'Operator',
    role: 'ADMIN',
    mfaEnabled: true,
    mfaSecret: 'encrypted-secret',
  };

  beforeEach(async () => {
    prisma = {
      user: { findUnique: jest.fn(async () => ({ ...user })) },
    };
    rateLimiter = {
      consume: jest.fn(async () => ({ allowed: true, count: 1, retryAfter: 0 })),
    };
    jwtService = {
      sign: jest.fn(() => 'challenge-token'),
      verify: jest.fn(() => ({ sub: 'user-1', type: 'mfa_challenge' })),
    };
    recoveryCodes = { consume: jest.fn(async () => false) };

    const moduleRef = await Test.createTestingModule({
      providers: [
        MfaChallengeService,
        { provide: require('@/prisma/prisma.service').PrismaService, useValue: prisma },
        { provide: require('@/modules/crypto/crypto.service').CryptoService, useValue: {
          encrypt: (v: string) => v,
          decrypt: (v: string) => v,
        } },
        { provide: require('@nestjs/jwt').JwtService, useValue: jwtService },
        { provide: require('@/modules/events/event.service').EventService, useValue: { emit: jest.fn() } },
        { provide: require('@/common/auth-rate-limiter.service').AuthRateLimiter, useValue: rateLimiter },
        { provide: MfaRecoveryCodeService, useValue: recoveryCodes },
        { provide: require('@nestjs/config').ConfigService, useValue: { get: () => 'test-secret' } },
      ],
    }).compile();

    service = moduleRef.get(MfaChallengeService);
  });

  it('counts the attempts', async () => {
    await service.complete('challenge-token', '123456');
    expect(rateLimiter.consume).toHaveBeenCalled();
  });

  it('is refused once the attempts run out', async () => {
    rateLimiter.consume.mockResolvedValueOnce({ allowed: false, count: 6, retryAfter: 300 });
    await expect(service.complete('challenge-token', '123456')).rejects.toBeInstanceOf(
      HttpException,
    );
  });

  it('never puts the challenge token itself in the rate-limit key', async () => {
    await service.complete('the-secret-challenge', '123456');
    const key = rateLimiter.consume.mock.calls[0][0];
    expect(key).not.toContain('the-secret-challenge');
  });

  it('accepts a recovery code, and uses it up', async () => {
    recoveryCodes.consume.mockResolvedValueOnce(true);
    const caller = await service.complete('challenge-token', 'abcd1234-efgh56');
    expect(caller.id).toBe('user-1');
    expect(recoveryCodes.consume).toHaveBeenCalledWith('user-1', 'abcd1234-efgh56');
  });

  it('refuses a challenge that has expired', async () => {
    jwtService.verify.mockImplementationOnce(() => { throw new Error('jwt expired'); });
    await expect(service.complete('challenge-token', '123456')).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('refuses a challenge that is not a challenge', async () => {
    jwtService.verify.mockImplementationOnce(() => ({ sub: 'user-1', type: 'access' }));
    await expect(service.complete('challenge-token', '123456')).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });
});
