import { Injectable, Inject, Logger, ServiceUnavailableException } from '@nestjs/common';
import { randomBytes } from 'crypto';
import { PrismaService } from '@/prisma/prisma.service';
import { CryptoService } from '@/modules/crypto/crypto.service';
import { RegistryProvider } from './registry-provider/registry-provider';
import { VerdaccioRegistryProvider } from './registry-provider/verdaccio.provider';

/**
 * The registry's own account, linked to the platform's user.
 *
 * The registry (Verdaccio) is a separate identity: its logins are htpasswd,
 * not the platform's. Linking is the platform minting the registry account
 * *for* the user — a password the platform generates and keeps encrypted —
 * so that one login reaches both systems and the user never maintains two.
 *
 * What stays where:
 *   - the registry PASSWORD is platform state: generated here, encrypted,
 *     and never returned in the clear (it is only ever used to mint tokens);
 *   - the registry TOKEN is user state: returned each link, kept on the
 *     user's machine (`~/.fidscript/registry.json`), and re-mintable any
 *     time from the stored password.
 *
 * The registry is spoken to only through the provider seam
 * (registry-provider/): the wire protocol lives there, not here.
 */
@Injectable()
export class RegistryAccountService {
  private readonly logger = new Logger(RegistryAccountService.name);

  constructor(
    private prisma: PrismaService,
    private crypto: CryptoService,
    @Inject(VerdaccioRegistryProvider) private provider: RegistryProvider,
  ) {}

  /** The registry's public address — what the user's machine talks to. */
  registryAddress(): string {
    return this.provider.address().registryUrl;
  }

  /**
   * Link the user's registry account. Returns the registry token — the one
   * secret the user's machine should keep. The password stays here, encrypted.
   */
  async link(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new ServiceUnavailableException('Unknown user');
    // The registry username is the user's email with @ read as a dot: one
    // identity, one account, and the link is auditable from either side.
    // The @ cannot stand — it is reserved in the npm user protocol and the
    // registry rejects it — but the dot keeps the name unique per domain.
    const name = user.email.replace('@', '.');

    const existing = await this.prisma.userRegistryCredential.findUnique({ where: { userId } });
    let token: string;
    if (existing) {
      // Already linked: sign the account in with the stored password and
      // mint a fresh token.
      let password: string;
      try {
        password = this.crypto.decrypt(existing.passwordEnc);
      } catch {
        // The stored credential can no longer be read (key rotated, data
        // damaged). The link must be re-made, not guessed.
        throw new ServiceUnavailableException(
          'The stored registry credential can no longer be read: unlink and link again.',
        );
      }
      const result = await this.provider.provision(name, password, true);
      if (result.rejected) {
        // The stored password no longer opens the registry account — it was
        // reset out-of-band. Say so plainly rather than guessing.
        throw new ServiceUnavailableException(
          'The registry credentials are out of sync: unlink and link again.',
        );
      }
      if (!result.ok) {
        throw this.registryDown(result.error);
      }
      token = result.token!;
      await this.prisma.userRegistryCredential.update({
        where: { id: existing.id },
        data: { lastUsedAt: new Date() },
      });
    } else {
      // First link: the platform generates the registry password.
      const password = randomBytes(24).toString('base64url');
      const result = await this.provider.provision(name, password, false);
      if (result.alreadyRegistered) {
        // The registry already has this name and it was not created by the
        // platform (we hold no password for it). Do not guess — the user
        // links it the manual way instead.
        throw new ServiceUnavailableException(
          `The registry already has an account for ${name} that the platform does not manage. ` +
            `Get its token from the registry's token page (${this.provider.address().tokenUrl}) ` +
            'and use `fidscript registry login --token`.',
        );
      }
      if (!result.ok) {
        throw this.registryDown(result.error);
      }
      token = result.token!;
      await this.prisma.userRegistryCredential.create({
        data: {
          userId,
          registryUser: name,
          passwordEnc: this.crypto.encrypt(password),
        },
      });
      this.logger.log(`Linked registry account for ${name}`);
    }

    return {
      registryUrl: this.registryAddress(),
      registryUser: name,
      registryToken: token,
      linked: true,
    };
  }

  /** The link's status, without minting anything. */
  async status(userId: string) {
    const row = await this.prisma.userRegistryCredential.findUnique({ where: { userId } });
    if (!row) {
      return { linked: false, registryUrl: this.registryAddress() };
    }
    return {
      linked: true,
      registryUrl: this.registryAddress(),
      registryUser: row.registryUser,
      linkedAt: row.linkedAt,
      lastUsedAt: row.lastUsedAt,
    };
  }

  /**
   * Unlink: forget the platform's copy of the registry password. The
   * registry account itself (if any) and any tokens already handed out
   * keep working — unlinking the link is not deleting the account. Token
   * revocation, where the registry allows it at all, is the user's call
   * on the registry's own token page (see the provider's `revocation`).
   */
  async unlink(userId: string) {
    await this.prisma.userRegistryCredential.deleteMany({ where: { userId } });
    this.logger.log(`Unlinked registry account for user ${userId}`);
    return { linked: false };
  }

  private registryDown(detail?: string) {
    return new ServiceUnavailableException(
      `The registry is not available: ${detail ?? 'it did not answer'}. Nothing was linked.`,
    );
  }
}
