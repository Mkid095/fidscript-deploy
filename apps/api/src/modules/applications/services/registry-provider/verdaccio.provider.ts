import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RegistryCatalogueService } from '../registry-catalogue.service';
import {
  RegistryProvider,
  RegistryProvisionResult,
} from './registry-provider';

/**
 * The provider for a Verdaccio speaking the npm couchdb user protocol.
 *
 * The wire truth (Verdaccio 6.10.5, htpasswd auth):
 *   - the user endpoint only answers to PUT — POST and DELETE are not
 *     routes; they 404 "Cannot POST/DELETE";
 *   - a PUT without credentials creates the user (201, a token in the
 *     body), or says the name is already registered (409) when someone
 *     else made it;
 *   - a PUT with Basic credentials signs an existing user in and mints a
 *     fresh token (201), or rejects them (401) when the password no
 *     longer opens the account;
 *   - there is no token revocation API: the user does it on the registry's
 *     own token page, so `revocation` is reported as user-side-only.
 */
@Injectable()
export class VerdaccioRegistryProvider implements RegistryProvider {
  /** No revocation API on the registry side; the user's token page is the way. */
  readonly revocation: 'user-side-only' = 'user-side-only';

  constructor(
    private config: ConfigService,
    private catalogue: RegistryCatalogueService,
  ) {}

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
      return { ok: false, alreadyRegistered: true };
    }
    if (response.status === 401 || response.status === 403) {
      return { ok: false, rejected: true, error: `the registry rejected the credentials` };
    }
    return { ok: false, error: `the registry at ${base} answered ${response.status}` };
  }

  address() {
    return this.catalogue.addresses();
  }
}
