import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { Test } from '@nestjs/testing';

import { AuthPasswordResetService } from './auth-password-reset.service';

/**
 * Setting a new password from a reset token.
 *
 * **The reset used to change nothing that mattered.** It wrote the
 * `UserCredential` row, but login reads `User.passwordHash` — so the new
 * password was accepted by nothing, and the account was locked out of its
 * own reset.
 */
describe('AuthPasswordResetService', () => {
  let service: AuthPasswordResetService;
  let prisma: any;

  const user = { id: 'user-1', email: 'operator@fidscript.com' };
  const token = {
    id: 'vt-1',
    userId: 'user-1',
    type: 'PASSWORD_RESET',
    consumed: false,
    expiresAt: new Date(Date.now() + 60 * 60 * 1000),
  };

  beforeEach(async () => {
    prisma = {
      user: {
        findUnique: jest.fn(async () => ({ ...user })),
        update: jest.fn(async () => ({})),
      },
      userCredential: { upsert: jest.fn(async () => ({})) },
      verificationToken: {
        findUnique: jest.fn(async () => null),
        update: jest.fn(async () => ({})),
      },
      session: { updateMany: jest.fn(async () => ({})) },
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        AuthPasswordResetService,
        { provide: require('@/prisma/prisma.service').PrismaService, useValue: prisma },
        { provide: require('@/modules/events/event.service').EventService, useValue: { emit: jest.fn() } },
        { provide: require('./auth-session.service').AuthSessionService, useValue: { createSession: jest.fn() } },
      ],
    }).compile();

    service = moduleRef.get(AuthPasswordResetService);
  });

  it('writes BOTH columns — the one login reads and the one the platform keeps', async () => {
    prisma.verificationToken.findUnique.mockResolvedValueOnce(token);
    await service.confirm({ token: 'abc', newPassword: 'A-strong-Password-1' });

    expect(prisma.userCredential.upsert).toHaveBeenCalled();
    // Login verifies against `User.passwordHash`. Without this the reset
    // changed nothing that matters.
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      data: expect.objectContaining({ passwordHash: expect.any(String), mustChangePassword: false }),
    });
  });

  it('ends every session', async () => {
    prisma.verificationToken.findUnique.mockResolvedValueOnce(token);
    await service.confirm({ token: 'abc', newPassword: 'A-strong-Password-1' });
    expect(prisma.session.updateMany).toHaveBeenCalled();
  });

  it('refuses a token that has been used', async () => {
    prisma.verificationToken.findUnique.mockResolvedValueOnce({ ...token, consumed: true });
    await expect(
      service.confirm({ token: 'abc', newPassword: 'A-strong-Password-1' }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('refuses a token that has expired', async () => {
    prisma.verificationToken.findUnique.mockResolvedValueOnce({
      ...token,
      expiresAt: new Date(Date.now() - 1000),
    });
    await expect(
      service.confirm({ token: 'abc', newPassword: 'A-strong-Password-1' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('refuses a token that is not a reset token', async () => {
    prisma.verificationToken.findUnique.mockResolvedValueOnce({ ...token, type: 'EMAIL_VERIFY' });
    await expect(
      service.confirm({ token: 'abc', newPassword: 'A-strong-Password-1' }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
