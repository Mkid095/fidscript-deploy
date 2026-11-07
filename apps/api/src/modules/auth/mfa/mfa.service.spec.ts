import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { Test } from '@nestjs/testing';

import { MfaService } from './mfa.service';
import { MfaRecoveryCodeService } from './mfa-recovery-code.service';

/**
 * The enrollment.
 *
 * What is checked here is the rules, not the arithmetic: a person who has
 * MFA on cannot replace their own secret without proving the old one, and
 * cannot turn MFA off without proving who they are.
 */
describe('MfaService', () => {
  let service: MfaService;
  let recoveryCodes: { generate: jest.Mock; clear: jest.Mock };
  let prisma: any;
  let crypto: any;

  const user = {
    id: 'user-1',
    email: 'operator@fidscript.com',
    name: 'Operator',
    role: 'ADMIN',
    mfaEnabled: true,
    mfaSecret: 'encrypted-secret',
    passwordHash: 'hash',
  };

  beforeEach(async () => {
    prisma = {
      user: {
        findUnique: jest.fn(async () => ({ ...user })),
        update: jest.fn(async () => ({})),
      },
    };
    crypto = {
      encrypt: jest.fn((value: string) => `enc:${value}`),
      decrypt: jest.fn((value: string) => value.replace(/^enc:/, '')),
    };
    recoveryCodes = { generate: jest.fn(), clear: jest.fn(async () => undefined) };

    const moduleRef = await Test.createTestingModule({
      providers: [
        MfaService,
        { provide: require('@/prisma/prisma.service').PrismaService, useValue: prisma },
        { provide: require('@/modules/crypto/crypto.service').CryptoService, useValue: crypto },
        { provide: require('@/modules/events/event.service').EventService, useValue: { emit: jest.fn() } },
        { provide: MfaRecoveryCodeService, useValue: recoveryCodes },
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
      expect(recoveryCodes.clear).toHaveBeenCalledWith('user-1');
    });
  });

  describe('the status', () => {
    it('says whether MFA is on', async () => {
      await expect(service.isEnabled('user-1')).resolves.toBe(true);
      prisma.user.findUnique.mockResolvedValueOnce({ mfaEnabled: false });
      await expect(service.isEnabled('user-1')).resolves.toBe(false);
    });
  });
});

// The real TOTP arithmetic needs a real secret and the real clock. What is
// being checked here is the RULES around it, so the code check is a stub.
jest.mock('otplib', () => ({
  generateSecret: jest.fn(() => 'JBSWY3DPEHPK3PXP'),
  generateURI: jest.fn(() => 'otpauth://totp/FIDScript?secret=JBSWY3DPEHPK3PXP'),
  verifySync: jest.fn(() => ({ valid: true })),
}));
