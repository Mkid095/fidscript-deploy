import { Injectable, Inject, Logger, ServiceUnavailableException } from '@nestjs/common';
import { randomBytes } from 'crypto';
import { Prisma } from '@prisma/client';
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
 * Lifecycle, said plainly:
 *   - link: create the registry user, or sign the existing one in and
 *     re-mint; the token is the only thing that leaves;
 *   - unlink: revoke the registry user (every token minted for it stops
 *     working) and forget the password. Revocation the registry cannot
 *     drive is reported as not revoked, never faked;
 *   - account deletion: the credential row cascades with the user; the
 *     registry side is `revoke()`'s to kill, and a flow that deletes
 *     users must call it before the cascade.
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

  /** What the registry can and cannot do about revocation, in one word. */
  revocation(): 'supported' | 'user-side-only' {
    return this.provider.revocation;
  }

  /**
   * Link the user's registry account. Returns the registry token — the one
   * secret the user's machine should keep. The password stays here, encrypted.
   */
  async link(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new ServiceUnavailableException('Unknown user');

    const existing = await this.prisma.userRegistryCredential.findUnique({ where: { userId } });
    let name: string;
    let token: string;
    if (existing) {
      // Already linked: the stored registry user is canonical — the email
      // was only the seed for the first link, and may have changed since.
      // Sign the account in with the stored password and mint a fresh token.
      name = existing.registryUser;
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
      // First link: the registry username is the user's email with @ read
      // as a dot — one identity, one account, auditable from either side.
      // The @ cannot stand (it is reserved in the npm user protocol); the
      // dot keeps the name one-to-one with the email in practice.
      name = user.email.replace('@', '.');

      // The mapping is not injective: a@b.co.uk and a.b@co.uk both land on
      // a.b.co.uk. One registry user belongs to exactly one platform
      // account — if another account already holds this name, the claim
      // fails with the reason, not a silent second owner.
      const holder = await this.prisma.userRegistryCredential.findUnique({
        where: { registryUser: name },
      });
      if (holder && holder.userId !== userId) {
        throw new ServiceUnavailableException(
          `The registry username this email maps to (${name}) is already in use by another ` +
            'platform account. Coordinate with the holder, or unlink it there first.',
        );
      }

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
      try {
        await this.prisma.userRegistryCredential.create({
          data: {
            userId,
            registryUser: name,
            passwordEnc: this.crypto.encrypt(password),
          },
        });
      } catch (err) {
        // Lost the race on the unique index: two accounts mapped to one
        // name. The row must not land — say why.
        if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
          throw new ServiceUnavailableException(
            `The registry username this email maps to (${name}) was taken by another account ` +
              'a moment ago. Coordinate with the holder, or unlink it there first.',
          );
        }
        throw err;
      }
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
   * Unlink: revoke the registry user — every token ever minted for it
   * stops authenticating — and forget the platform's copy of the password.
   *
   * The halves stay distinct on purpose: a revocation the registry cannot
   * drive is reported as not revoked, and the link is not claimed unlinked
   * on the registry side. A revocation that merely failed (a file the
   * platform may not write) leaves the row in place rather than
   * pretending.
   */
  async unlink(userId: string) {
    const row = await this.prisma.userRegistryCredential.findUnique({ where: { userId } });
    if (!row) {
      return { linked: false, revoked: false };
    }
    const result = await this.provider.revoke(row.registryUser);
    if (result.ok || result.unsupported) {
      await this.prisma.userRegistryCredential.deleteMany({ where: { userId } });
      this.logger.log(
        result.ok
          ? `Unlinked and revoked registry account ${row.registryUser} for user ${userId}`
          : `Unlinked registry account ${row.registryUser} for user ${userId} — revocation is user-side-only on this registry`,
      );
      return {
        linked: false,
        revoked: result.ok,
        registryUser: row.registryUser,
        note: result.unsupported ? result.error : undefined,
      };
    }
    // The registry refused the revocation: the tokens may still be live, so
    // the link must stay where it is and say so.
    throw new ServiceUnavailableException(
      `The registry could not be revoked: ${result.error}. The link stays in place; ` +
        'ask the registry admin to delete the user, or retry.',
    );
  }

  /**
   * Kill the registry side of a link without removing the row: the step an
   * account-deletion flow runs before the Prisma cascade takes the row.
   * Best-effort by contract — a deletion is not blocked by the registry,
   * and the result is the caller's to surface.
   */
  async revoke(userId: string): Promise<{ revoked: boolean; note?: string }> {
    const row = await this.prisma.userRegistryCredential.findUnique({ where: { userId } });
    if (!row) {
      return { revoked: false };
    }
    const result = await this.provider.revoke(row.registryUser);
    if (result.ok) {
      this.logger.log(`Revoked registry account ${row.registryUser} for user ${userId} (deletion path)`);
      return { revoked: true };
    }
    this.logger.warn(
      `Could not revoke registry account ${row.registryUser} for user ${userId}: ` +
        `${result.unsupported ? 'user-side-only on this registry' : result.error}`,
    );
    return { revoked: false, note: result.error };
  }

  private registryDown(detail?: string) {
    return new ServiceUnavailableException(
      `The registry is not available: ${detail ?? 'it did not answer'}. Nothing was linked.`,
    );
  }
}
