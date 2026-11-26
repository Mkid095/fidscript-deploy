/**
 * The registry provider seam.
 *
 * The platform talks to its package registry only through this interface —
 * never through a concrete registry's wire protocol. The registry the
 * platform uses today is Verdaccio (npm's couchdb user protocol); the one
 * it uses tomorrow may not be, and nothing above this line should care.
 *
 * What the seam covers, and what it deliberately does not:
 *   - provisioning: create a registry user, or sign an existing one in to
 *     mint a token — the two operations a link needs;
 *   - auth: a token the provider minted is the credential, checked by the
 *     registry itself on every wire request;
 *   - revocation: whether the platform can kill a token from here. Some
 *     registries say yes, some only let the user do it, some have no such
 *     API at all — the provider reports which, so callers can be honest.
 *
 * Publishing and installation are not on the seam: they run from the user's
 * machine straight to the registry over the npm protocol, with the token the
 * provider minted. The platform's job ends at the token.
 */

export interface RegistryProvisionResult {
  ok: boolean;
  /** The token the registry minted — the only secret that may leave. */
  token?: string;
  /** The registry has this name and it was not created by the platform. */
  alreadyRegistered?: boolean;
  /** The registry rejected the credentials (a stored password no longer fits). */
  rejected?: boolean;
  /** A human detail when !ok — the registry's address is in it. */
  error?: string;
}

/**
 * The outcome of a revocation.
 *
 * `ok` — the registry user is gone and every token ever minted for it no
 * longer authenticates anywhere.
 * `unsupported` — this registry has no mechanism the platform can drive;
 * only the registry's own user or admin can revoke. Callers must say so,
 * not pretend.
 */
export interface RegistryRevokeResult {
  ok: boolean;
  unsupported?: boolean;
  error?: string;
}

export interface RegistryProvider {
  /**
   * Provision the registry account for `name`.
   *
   * `login: false` — the account is being made: the registry must not have
   * this name yet, and the provider answers either with a token (created)
   * or `alreadyRegistered` (someone else made it first).
   *
   * `login: true` — the account exists and `password` is its password:
   * the provider signs it in and mints a fresh token, or answers
   * `rejected` when the password no longer opens it.
   */
  provision(name: string, password: string, login: boolean): Promise<RegistryProvisionResult>;

  /**
   * Revoke: make the registry user — and every token minted for it — stop
   * working. The provider reports `unsupported` when the registry has no
   * mechanism it can drive; callers must surface that, never fake it.
   */
  revoke(name: string): Promise<RegistryRevokeResult>;

  /** The registry's public address — what the user's machine talks to. */
  address(): { registryUrl: string; tokenUrl: string };

  /**
   * Can the platform revoke a token it minted, and how?
   * `supported` — the provider can delete the registry user (tokens die
   * with it); `user-side-only` — only the registry's user/admin can.
   */
  readonly revocation: 'supported' | 'user-side-only';
}
