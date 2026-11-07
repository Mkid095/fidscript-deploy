import { BadRequestException, UnauthorizedException, HttpException } from '@nestjs/common';
import { Test } from '@nestjs/testing';

import { MfaService } from './mfa.service';

// The real TOTP arithmetic needs a real secret and the real clock. What is
// being checked here is the RULES around it, so the code check is a stub.
jest.mock('otplib', () => ({
  generateSecret: jest.fn(() => 'JBSWY3DPEHPK3PXP'),
  generateURI: jest.fn(() => 'otpauth://totp/FIDScript?secret=JBSWY3DPEHPK3PXP'),
  verifySync: jest.fn(() => ({ valid: true })),
}));

/**
 * The second factor.
 *
 * What is checked here is the rules, not the arithmetic: a person who has
 * MFA on cannot replace their own secret without proving the old one, cannot
 * turn MFA off without proving who they are, and cannot get back in with a
 * recovery code twice.
 */
describe('MfaService', () => {
  let service: MfaService;
  let prisma: any;
  let crypto: any;
  let rateLimiter: any;
  let jwtService: any;

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
      user: {
        findUnique: jest.fn(async () => ({ ...user })),
        update: jest.fn(async () => ({})),
      },
      mfaRecoveryCode: {
        createMany: jest.fn(async () => ({})),
        findMany: jest.fn(async () => []),
        update: jest.fn(async () => ({})),
        deleteMany: jest.fn(async () => ({})),
        count: jest.fn(async () => 3),
      },
      session: { updateMany: jest.fn(async () => ({})) },
    };
    crypto = {
      encrypt: jest.fn((value: string) => `enc:${value}`),
      decrypt: jest.fn((value: string) => value.replace(/^enc:/, '')),
    };
    rateLimiter = {
      consume: jest.fn(async () => ({ allowed: true, count: 1, retryAfter: 0 })),
    };
    jwtService = {
      sign: jest.fn(() => 'challenge-token'),
      verify: jest.fn(() => ({ sub: 'user-1', type: 'mfa_challenge' })),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        MfaService,
        { provide: require('@/prisma/prisma.service').PrismaService, useValue: prisma },
        { provide: require('@/modules/crypto/crypto.service').CryptoService, useValue: crypto },
        { provide: require('@nestjs/jwt').JwtService, useValue: jwtService },
        { provide: require('@/modules/events/event.service').EventService, useValue: { emit: jest.fn() } },
        { provide: require('@/common/auth-rate-limiter.service').AuthRateLimiter, useValue: rateLimiter },
        { provide: require('@nestjs/config').ConfigService, useValue: { get: () => 'test-secret' } },
      ],
    }).compile();

    service = moduleRef.get(MfaService);
  });

  describe('setting up', () => {
    it('returns a secret and an otpauth URL', async () => {
      prisma.user.findUnique.mockResolvedValue({ ...user, mfaEnabled: false, mfaSecret: null });
      const res = await service.setup('user-1');
      expect(res.secret).toBe('JBSWY3DPEHPK3PXP');
      expect(res.otpauthUrl).toContain('otpauth://');
    });

    it('refuses to replace a secret that is already in use', async () => {
      await expect(service.setup('user-1')).rejects.toBeInstanceOf(BadRequestException);
    });

    it('needs the current factor to replace a secret that is already in use', async () => {
      const otplib = require('otplib');
      otplib.verifySync.mockReturnValueOnce({ valid: false });
      await expect(service.setup('user-1', '000000')).rejects.toBeInstanceOf(UnauthorizedException);
    });
  });

  describe('recovery codes', () => {
    it('are generated, stored as hashes, and returned once', async () => {
      const res = await service.generateRecoveryCodes('user-1');
      expect(res.codes).toHaveLength(10);
      // The stored form is a hash — the plain code never reaches the table.
      const stored = prisma.mfaRecoveryCode.createMany.mock.calls[0][0].data;
      expect(stored[0].codeHash).not.toBe(res.codes[0]);
      expect(stored[0].codeHash).toMatch(/^\$2/);
    });

    it('cannot be generated before MFA is on', async () => {
      prisma.user.findUnique.mockResolvedValue({ ...user, mfaEnabled: false });
      await expect(service.generateRecoveryCodes('user-1')).rejects.toBeInstanceOf(BadRequestException);
    });

    it('counts the ones that are left', async () => {
      await expect(service.remainingRecoveryCodes('user-1')).resolves.toEqual({ remaining: 3 });
    });
  });

  describe('turning it off', () => {
    it('needs the password', async () => {
      await expect(service.disable('user-1', { password: 'wrong' })).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
    });

    it('clears the secret and the recovery codes when the password is right', async () => {
      prisma.user.findUnique.mockResolvedValue({ ...user, passwordHash: 'hash' });
      const bcrypt = require('bcrypt');
      jest.spyOn(bcrypt, 'compare').mockResolvedValueOnce(true as never);

      await expect(service.disable('user-1', { password: 'right' })).resolves.toEqual({ disabled: true });
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: { mfaEnabled: false, mfaSecret: null },
      });
      expect(prisma.mfaRecoveryCode.deleteMany).toHaveBeenCalled();
    });
  });

  describe('the challenge', () => {
    it('counts the attempts', async () => {
      await service.completeChallenge('challenge-token', '123456');
      expect(rateLimiter.consume).toHaveBeenCalled();
    });

    it('is refused once the attempts run out', async () => {
      rateLimiter.consume.mockResolvedValueOnce({ allowed: false, count: 6, retryAfter: 300 });
      await expect(service.completeChallenge('challenge-token', '123456')).rejects.toBeInstanceOf(
        HttpException,
      );
    });

    it('never puts the challenge token itself in the rate-limit key', async () => {
      await service.completeChallenge('the-secret-challenge', '123456');
      const key = rateLimiter.consume.mock.calls[0][0];
      expect(key).not.toContain('the-secret-challenge');
    });

    it('accepts a recovery code, and uses it up', async () => {
      prisma.mfaRecoveryCode.findMany.mockResolvedValueOnce([
        { id: 'rc-1', codeHash: '$2a$10$hash' },
      ]);
      const bcrypt = require('bcrypt');
      jest.spyOn(bcrypt, 'compare').mockResolvedValueOnce(true as never);

      const user_ = await service.completeChallenge('challenge-token', 'abcd1234-efgh56');
      expect(user_.id).toBe('user-1');
      expect(prisma.mfaRecoveryCode.update).toHaveBeenCalledWith({
        where: { id: 'rc-1' },
        data: { usedAt: expect.any(Date) },
      });
    });

    it('refuses a challenge that has expired', async () => {
      jwtService.verify.mockImplementationOnce(() => { throw new Error('jwt expired'); });
      await expect(service.completeChallenge('challenge-token', '123456')).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
    });
  });
});
