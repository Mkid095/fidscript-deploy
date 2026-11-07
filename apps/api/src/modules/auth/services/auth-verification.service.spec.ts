import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { Test } from '@nestjs/testing';

import { AuthVerificationService } from './auth-verification.service';

/**
 * The verification flows.
 *
 * Two things are checked here, and both used to be wrong:
 *
 * 1. **A password reset has to change the password.** It wrote the
 *    `UserCredential` row, but login reads `User.passwordHash` — so the
 *    account was locked out of its own reset.
 * 2. **Asking for a reset must not say whether the account exists.** The
 *    form says "if this address is registered, we sent a link"; the API
 *    used to answer 404, which is an oracle.
 */
describe('AuthVerificationService', () => {
  let service: AuthVerificationService;
  let prisma: any;
  let mail: { send: jest.Mock };
  let emailService: { build: jest.Mock; linkFor: jest.Mock };

  const user = { id: 'user-1', email: 'operator@fidscript.com', name: 'Operator' };

  beforeEach(async () => {
    prisma = {
      user: {
        findUnique: jest.fn(async () => ({ ...user })),
        update: jest.fn(async () => ({})),
      },
      userCredential: { upsert: jest.fn(async () => ({})) },
      verificationToken: {
        findUnique: jest.fn(async () => null),
        create: jest.fn(async () => ({})),
        update: jest.fn(async () => ({})),
        updateMany: jest.fn(async () => ({})),
      },
      session: { updateMany: jest.fn(async () => ({})) },
    };
    mail = { send: jest.fn(async () => undefined) };
    emailService = {
      build: jest.fn(() => ({ subject: 'Reset your password', text: 'body', html: '<p>body</p>' })),
      linkFor: jest.fn(() => 'https://fidscript.com/reset-password?token=abc'),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        AuthVerificationService,
        { provide: require('@/prisma/prisma.service').PrismaService, useValue: prisma },
        { provide: require('@/modules/events/event.service').EventService, useValue: { emit: jest.fn() } },
        { provide: require('@/modules/email/platform-mail.service').PlatformMailService, useValue: mail },
        { provide: require('./auth-verification-email').AuthVerificationEmailService, useValue: emailService },
      ],
    }).compile();

    service = moduleRef.get(AuthVerificationService);
  });

  describe('asking for a reset', () => {
    it('always says it was sent', async () => {
      await expect(service.sendVerification({ email: 'nobody@fidscript.com', type: 'PASSWORD_RESET' }))
        .resolves.toEqual({ sent: true });
    });

    it('says the same thing when the account does not exist', async () => {
      prisma.user.findUnique.mockResolvedValueOnce(null);
      const unknown = await service.sendVerification({ email: 'nobody@fidscript.com', type: 'PASSWORD_RESET' });
      const known = await service.sendVerification({ email: 'operator@fidscript.com', type: 'PASSWORD_RESET' });
      expect(unknown).toEqual(known);
      // Only the account that exists got a token and a mail.
      expect(prisma.verificationToken.create).toHaveBeenCalledTimes(1);
      expect(mail.send).toHaveBeenCalledTimes(1);
    });

    it('sends the mail for an account that exists', async () => {
      await service.sendVerification({ email: 'operator@fidscript.com', type: 'PASSWORD_RESET' });
      expect(prisma.verificationToken.create).toHaveBeenCalled();
      expect(mail.send).toHaveBeenCalled();
    });

    it('builds the mail for the kind of token it was asked for', async () => {
      await service.sendVerification({ email: 'operator@fidscript.com', type: 'PASSWORD_RESET' });
      expect(emailService.build).toHaveBeenCalledWith('PASSWORD_RESET', expect.any(String), expect.any(String));
    });

    it('does not fail when the mail does not go out', async () => {
      mail.send.mockRejectedValueOnce(new Error('smtp is down'));
      await expect(
        service.sendVerification({ email: 'operator@fidscript.com', type: 'PASSWORD_RESET' }),
      ).resolves.toEqual({ sent: true });
    });
  });

  describe('confirming an email', () => {
    it('marks the address verified', async () => {
      prisma.verificationToken.findUnique.mockResolvedValueOnce({
        id: 'vt-2',
        userId: 'user-1',
        type: 'EMAIL_VERIFY',
        consumed: false,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      });
      await expect(service.verifyEmail({ token: 'abc' })).resolves.toEqual({
        verified: true,
        email: 'operator@fidscript.com',
      });
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: { emailVerifiedAt: expect.any(Date) },
      });
    });
  });
});
