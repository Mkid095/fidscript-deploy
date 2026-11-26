import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { randomBytes } from 'crypto';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '@/prisma/prisma.service';
import { CryptoService } from '@/modules/crypto/crypto.service';
import { RegistryCatalogueService } from './registry-catalogue.service';

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
 *     and never returned in the clear (it is only ever used to mint tokens).
 *   - the registry TOKEN is user state: returned once, kept on the user's
 *     machine (`~/.fidscript/registry.json`), and re-mintable any time from
 *     the stored password.
 *
 * The registry is spoken to over the npm wire protocol's own user endpoint
 * — the same one `npm login` uses — so no registry-internal API is needed.
 */
@Injectable()
export class RegistryAccountService {
  private readonly logger = new Logger(RegistryAccountService.name);

  constructor(
    private prisma: PrismaService,
    private crypto: CryptoService,
    private config: ConfigService,
    private registry: RegistryCatalogueService,
  ) {}

  /** The registry's own address, the short way round when the platform knows it. */
  private registryBase(): string {
    const internal = this.config.get<string>('REGISTRY_INTERNAL_URL', '').replace(/\/+$/, '');
    return internal || this.registry.addresses().registryUrl;
  }

  /** The registry's public address — what the user's machine talks to. */
  registryAddress(): string {
    return this.registry.addresses().registryUrl;
  }

  /**
   * Link the user's registry account. Returns the registry token — the one
   * secret the user's machine should keep. The password stays here, encrypted.
   */
  async link(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new ServiceUnavailableException('Unknown user');
    // The registry username is the user's email: one identity, one account,
    // and the link is auditable from either side.
    const name = user.email;
    const base = this.registryBase();

    const existing = await this.prisma.userRegistryCredential.findUnique({ where: { userId } });
    let token: string;
    if (existing) {
      // Already linked: mint a fresh token with the stored password.
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
      const result = await this.verdaccioUser(name, password, base);
      if (result.status === 401 || result.status === 403) {
        // The stored password no longer opens the registry account — it was
        // reset out-of-band. Say so plainly rather than guessing.
        throw new ServiceUnavailableException(
          'The registry credentials are out of sync: unlink and link again.',
        );
      }
      if (!result.ok) {
        throw this.registryDown(base, result.error);
      }
      token = result.token!;
      await this.prisma.userRegistryCredential.update({
        where: { id: existing.id },
        data: { lastUsedAt: new Date() },
      });
    } else {
      // First link: the platform generates the registry password.
      const password = randomBytes(24).toString('base64url');
      const result = await this.verdaccioUser(name, password, base);
      if (result.status === 409) {
        // The registry already has this name and it was not created by the
        // platform (we hold no password for it). Do not guess — the user
        // links it the manual way instead.
        throw new ServiceUnavailableException(
          `The registry already has an account for ${name} that the platform does not manage. ` +
            'Get its token from the registry token page and use `fidscript registry login --token`.',
        );
      }
      if (!result.ok) {
        throw this.registryDown(base, result.error);
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
   * keep working — unlinking the link is not deleting the account.
   */
  async unlink(userId: string) {
    await this.prisma.userRegistryCredential.deleteMany({ where: { userId } });
    this.logger.log(`Unlinked registry account for user ${userId}`);
    return { linked: false };
  }

  /**
   * The registry's user endpoint — the one `npm login` uses. A POST with a
   * password creates the user when it is new, or mints a token when the
   * password is the existing user's. The two are the same request.
   */
  private async verdaccioUser(
    name: string,
    password: string,
    base: string,
  ): Promise<{ ok: boolean; status?: number; token?: string; error?: string }> {
    let response: Response;
    try {
      response = await fetch(`${base}/-/user/org.couchdb.user:${encodeURIComponent(name)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, password, email: name }),
        signal: AbortSignal.timeout(10000),
      });
    } catch (err) {
      return { ok: false, error: `the registry did not answer: ${(err as Error).message}` };
    }
    if (response.status === 201 || response.status === 200) {
      const body = (await response.json().catch(() => null)) as { token?: string } | null;
      if (!body?.token) {
        return { ok: false, error: 'the registry answered without a token' };
      }
      return { ok: true, token: body.token };
    }
    if (response.status === 409) return { ok: false, status: 409, error: 'conflict' };
    if (response.status === 401 || response.status === 403) {
      return { ok: false, status: response.status, error: 'the registry rejected the credentials' };
    }
    return { ok: false, status: response.status, error: `the registry answered ${response.status}` };
  }

  private registryDown(base: string, detail?: string) {
    return new ServiceUnavailableException(
      `The registry at ${base} is not available: ${detail ?? 'it did not answer'}. ` +
        'Nothing was linked.',
    );
  }
}
