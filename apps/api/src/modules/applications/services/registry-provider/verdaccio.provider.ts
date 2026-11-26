import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { chmod, chown, readdir, rm, stat, writeFile, rename, readFile } from 'fs/promises';
import { basename, dirname } from 'path';
import { RegistryCatalogueService } from '../registry-catalogue.service';
import {
  RegistryProvider,
  RegistryProvisionResult,
  RegistryRevokeResult,
} from './registry-provider';

/**
 * The provider for a Verdaccio speaking the npm couchdb user protocol.
 *
 * The wire truth (Verdaccio 6.10.5, htpasswd auth):
 *   - the user endpoint only answers to PUT — POST and DELETE are not
 *     routes; they 404 "Cannot POST/DELETE";
 *   - a PUT without credentials creates the user (201, a token in the
 *     body), or says the name is taken (409, "already registered") when
 *     someone else made it;
 *   - a PUT with Basic credentials signs an existing user in and mints a
 *     fresh token (201), or rejects them (401) when the password no
 *     longer opens the account;
 *   - there is no password rotation or revocation on the wire: rotating
 *     the secret answers 401, and the reset endpoint the registry's own
 *     pages call does not exist. The only revocation that works is
 *     deleting the user's htpasswd entry — which the registry itself
 *     cannot do through its API.
 *
 * So `revoke` works through the user database file, when the platform has
 * been given one (`REGISTRY_USERDB_FILE`): the entry is removed, every
 * token minted for that user stops authenticating, and the registry keeps
 * working for everyone else. Without the file, revocation is reported as
 * user-side-only rather than faked.
 */
@Injectable()
export class VerdaccioRegistryProvider implements RegistryProvider {
  private readonly logger = new Logger(VerdaccioRegistryProvider.name);

  constructor(
    private config: ConfigService,
    private catalogue: RegistryCatalogueService,
  ) {}

  /**
   * The registry's user database, when the platform may edit it. This is
   * a deliberately narrow capability: with it, unlinking a platform user
   * can revoke the registry user; without it, only the registry's own
   * admin can.
   */
  private userdbFile(): string | undefined {
    return this.config.get<string>('REGISTRY_USERDB_FILE', '').trim() || undefined;
  }

  /**
   * Revocation on this backend means deleting the user's htpasswd entry,
   * and only when the platform holds the file.
   */
  get revocation(): 'supported' | 'user-side-only' {
    return this.userdbFile() ? 'supported' : 'user-side-only';
  }

  private base(): string {
    const internal = this.config.get<string>('REGISTRY_INTERNAL_URL', '').replace(/\/+$/, '');
    return internal || this.catalogue.addresses().registryUrl;
  }

  async provision(name: string, password: string, login: boolean): Promise<RegistryProvisionResult> {
    const base = this.base();
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (login) {
      // Basic auth makes the PUT a sign-in, not a creation: the registry
      // checks the password and mints a token for the existing account.
      headers.Authorization = `Basic ${Buffer.from(`${name}:${password}`).toString('base64')}`;
    }
    let response: Response;
    try {
      response = await fetch(
        `${base}/-/user/org.couchdb.user:${encodeURIComponent(name)}`,
        {
          method: 'PUT',
          headers,
          body: JSON.stringify({ name, password, email: name }),
          signal: AbortSignal.timeout(10000),
        },
      );
    } catch (err) {
      return {
        ok: false,
        error: `the registry at ${base} did not answer: ${(err as Error).message}`,
      };
    }
    if (response.status === 201 || response.status === 200) {
      const body = (await response.json().catch(() => null)) as { token?: string } | null;
      if (!body?.token) {
        return { ok: false, error: `the registry at ${base} answered without a token` };
      }
      return { ok: true, token: body.token };
    }
    if (response.status === 409 && !login) {
      // Two different 409s: the name is taken by someone else (a registry
      // fact) versus the name being illegal for this registry (a bug in
      // what we sent). Only the first is `alreadyRegistered`.
      const body = (await response.json().catch(() => null)) as { error?: unknown } | null;
      const error = typeof body?.error === 'string' ? body.error : String(body?.error ?? response.status);
      if (/already registered/i.test(error)) {
        return { ok: false, alreadyRegistered: true };
      }
      return { ok: false, error: `the registry at ${base} refused the name: ${error}` };
    }
    if (response.status === 401 || response.status === 403) {
      return { ok: false, rejected: true, error: `the registry rejected the credentials` };
    }
    return { ok: false, error: `the registry at ${base} answered ${response.status}` };
  }

  async revoke(name: string): Promise<RegistryRevokeResult> {
    const file = this.userdbFile();
    if (!file) {
      return {
        ok: false,
        unsupported: true,
        error:
          'this registry has no revocation the platform can drive: its admin ' +
          'must delete the user (or the user must reset the password on the token page)',
      };
    }
    let lines: string[];
    try {
      const text = await readFile(file, 'utf8');
      lines = text.split('\n');
    } catch (err) {
      return { ok: false, error: `the registry user database could not be read: ${(err as Error).message}` };
    }
    const prefix = `${name}:`;
    if (!lines.some((line) => line.startsWith(prefix))) {
      // Nothing to revoke: the user is not in the database (already gone,
      // or was never made). Revoke is idempotent — that is success.
      return { ok: true };
    }
    // Rewrite through a sibling temp file and rename, so a failure midway
    // never leaves the database truncated. Then hand the file back to the
    // registry's own user: it must stay able to append new users.
    const kept = lines.filter((line) => !line.startsWith(prefix));
    const target = await this.rewriteAtomically(file, kept.join('\n') + '\n');
    if (!target.ok) {
      return target;
    }
    this.logger.log(`Revoked registry user ${name} (htpasswd entry removed)`);
    return { ok: true };
  }

  private async rewriteAtomically(
    file: string,
    content: string,
  ): Promise<{ ok: boolean; error?: string }> {
    const dir = dirname(file);
    const original = await stat(file).catch(() => null);
    const temp = `${file}.revoke-${process.pid}-${Date.now()}`;
    try {
      await writeFile(temp, content, 'utf8');
      if (original) {
        // Preserve ownership and mode so the registry process (its own
        // uid, often not the platform's) can keep writing the file.
        await chown(temp, original.uid, original.gid).catch(() => undefined);
        await chmod(temp, original.mode & 0o777).catch(() => undefined);
      }
      await rename(temp, file);
    } catch (err) {
      await rm(temp, { force: true }).catch(() => undefined);
      return { ok: false, error: `the registry user database could not be updated: ${(err as Error).message}` };
    }
    // Sweep stale temp files from earlier attempts that died midway.
    const entries = await readdir(dir).catch(() => [] as string[]);
    await Promise.all(
      entries
        .filter((entry) => entry.startsWith(`${basename(file)}.revoke-`) && entry !== `${basename(file)}.revoke-${process.pid}-${Date.now()}`)
        .map((entry) => rm(`${dir}/${entry}`, { force: true }).catch(() => undefined)),
    );
    return { ok: true };
  }

  address() {
    return this.catalogue.addresses();
  }
}
