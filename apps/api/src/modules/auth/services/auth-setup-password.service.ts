import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '@/prisma/prisma.service';

const BCRYPT_ROUNDS = 12;

/**
 * The company password — the shared secret that gates registration.
 *
 * The person running the platform sets it during setup (or rotates it later
 * from the settings screen). A bcrypt hash is stored on the platform's own
 * installation settings: the password itself is never written anywhere, and
 * it is never returned by any endpoint.
 */
@Injectable()
export class AuthSetupPasswordService {
  constructor(private prisma: PrismaService) {}

  /** Whether the platform has a company password set. */
  async isConfigured(): Promise<boolean> {
    const settings = await this.prisma.installationSettings.findUnique({
      where: { id: 'installation' },
      select: { setupPasswordHash: true },
    });
    return !!settings?.setupPasswordHash;
  }

  /** Set — or rotate — the company password. */
  async set(password: string): Promise<void> {
    const hash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    await this.prisma.installationSettings.upsert({
      where: { id: 'installation' },
      create: { id: 'installation', setupPasswordHash: hash },
      update: { setupPasswordHash: hash },
    });
  }

  /**
   * Whether a presented company password is acceptable.
   *
   * A platform with no company password has open registration — the same
   * meaning the old invite keyword had when it was unset.
   */
  async allows(password: string | undefined): Promise<boolean> {
    const settings = await this.prisma.installationSettings.findUnique({
      where: { id: 'installation' },
      select: { setupPasswordHash: true },
    });
    const hash = settings?.setupPasswordHash;
    if (!hash) return true;
    if (!password) return false;
    return bcrypt.compare(password, hash);
  }
}
