/**
 * The mail server's JMAP credential.
 *
 * The installer writes the admin credential as `user:hash` — the same format
 * as `STALWART_RECOVERY_ADMIN`, where the hash is the SHA-256 of the admin
 * password. It was handed to the mail server as a whole, so the password went
 * out as `admin:<hash>` and the mail server answered 401 for a credential
 * that was right.
 */

/** The user and the secret, as the mail server wants them. */
export interface StalwartJmapCredentials {
  user: string;
  pass: string;
}

/**
 * Split the credential into its user and its secret.
 *
 * A value that carries a user (`admin:<64 hex characters>`) is split; a
 * plain secret is used as it is, with the configured user (or `admin`).
 */
export function parseJmapCredential(configuredUser: string, secret: string): StalwartJmapCredentials {
  const split = /^(?<user>[^:]+):(?<hash>[0-9a-f]{64})$/.exec(secret);
  return {
    user: configuredUser || split?.groups?.user || 'admin',
    pass: split?.groups?.hash ?? secret,
  };
}
