import { Test } from '@nestjs/testing';

import { MfaRecoveryCodeService } from './mfa-recovery-code.service';

/**
 * The recovery codes: ten of them, single-use, and stored as hashes — the
 * plaintext is shown once and never again.
 */
describe('MfaRecoveryCodeService', () => {
  let service: MfaRecoveryCodeService;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      user: { findUnique: jest.fn(async () => ({ id: 'user-1', mfaEnabled: true })) },
      mfaRecoveryCode: {
        createMany: jest.fn(async () => ({})),
        findMany: jest.fn(async () => []),
        update: jest.fn(async () => ({})),
        deleteMany: jest.fn(async () => ({})),
        count: jest.fn(async () => 3),
      },
    };
    const moduleRef = await Test.createTestingModule({
      providers: [
        MfaRecoveryCodeService,
        { provide: require('@/prisma/prisma.service').PrismaService, useValue: prisma },
      ],
    }).compile();
    service = moduleRef.get(MfaRecoveryCodeService);
  });

  it('generates ten, stores them as hashes, and returns them in plain', async () => {
    const res = await service.generate('user-1');
    expect(res.codes).toHaveLength(10);
    const stored = prisma.mfaRecoveryCode.createMany.mock.calls[0][0].data;
    expect(stored[0].codeHash).not.toBe(res.codes[0]);
    expect(stored[0].codeHash).toMatch(/^\$2/);
  });

  it('cannot be generated before MFA is on', async () => {
    prisma.user.findUnique.mockResolvedValueOnce({ id: 'user-1', mfaEnabled: false });
    await expect(service.generate('user-1')).rejects.toThrow();
  });

  it('counts the ones that are left', async () => {
    await expect(service.remaining('user-1')).resolves.toEqual({ remaining: 3 });
  });

  it('marks a used code as used', async () => {
    const bcrypt = require('bcrypt');
    jest.spyOn(bcrypt, 'compare').mockResolvedValueOnce(true as never);
    prisma.mfaRecoveryCode.findMany.mockResolvedValueOnce([{ id: 'rc-1', codeHash: '$2a$10$hash' }]);

    await expect(service.consume('user-1', 'abcd1234-efgh56')).resolves.toBe(true);
    expect(prisma.mfaRecoveryCode.update).toHaveBeenCalledWith({
      where: { id: 'rc-1' },
      data: { usedAt: expect.any(Date) },
    });
  });
});
