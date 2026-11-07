import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';

const RECOVERY_CODE_COUNT = 10;
const BCRYPT_ROUNDS = 10;

/**
 * The recovery codes.
 *
 * A person who loses their authenticator still has to get back in. Ten
 * single-use codes, stored as bcrypt hashes — the plaintext is shown once,
 * when they are generated, and never again. A database read does not hand
 * anybody the ability to get back into an account.
 */
@Injectable()
export class MfaRecoveryCodeService {
  constructor(private readonly prisma: PrismaService) {}

  /** Generates a fresh set and returns them in plain. This is the only time. */
  async generate(userId: string): Promise<{ codes: string[] }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, mfaEnabled: true },
    });
    if (!user) throw new NotFoundException('User not found');
    if (!user.mfaEnabled) {
      throw new BadRequestException('Turn MFA on before generating recovery codes.');
    }

    const codes = Array.from({ length: RECOVERY_CODE_COUNT }, () => this.newCode());
    await this.prisma.mfaRecoveryCode.deleteMany({ where: { userId } });
    await this.prisma.mfaRecoveryCode.createMany({
      data: codes.map((code) => ({
        userId,
        codeHash: bcrypt.hashSync(code, BCRYPT_ROUNDS),
      })),
    });
    return { codes };
  }

  /** How many are still unused. */
  async remaining(userId: string): Promise<{ remaining: number }> {
    const remaining = await this.prisma.mfaRecoveryCode.count({
      where: { userId, usedAt: null },
    });
    return { remaining };
  }

  /** Consumes a recovery code, if it is one and it is unused. */
  async consume(userId: string, code: string): Promise<boolean> {
    const candidates = await this.prisma.mfaRecoveryCode.findMany({
      where: { userId, usedAt: null },
      select: { id: true, codeHash: true },
    });
    for (const candidate of candidates) {
      if (await bcrypt.compare(code, candidate.codeHash)) {
        await this.prisma.mfaRecoveryCode.update({
          where: { id: candidate.id },
          data: { usedAt: new Date() },
        });
        return true;
      }
    }
    return false;
  }

  /** Removes them all — when MFA is turned off, they mean nothing. */
  async clear(userId: string): Promise<void> {
    await this.prisma.mfaRecoveryCode.deleteMany({ where: { userId } });
  }

  /** A code: eight characters, a dash, six more. Never like a TOTP code. */
  private newCode(): string {
    const alphabet = 'abcdefghijkmnopqrstuvwxyz23456789';
    const pick = (n: number) =>
      Array.from({ length: n }, () => alphabet[crypto.randomInt(0, alphabet.length)]).join('');
    return `${pick(8)}-${pick(6)}`;
  }
}
