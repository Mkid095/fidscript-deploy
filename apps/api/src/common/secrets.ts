import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';

/**
 * Resolve the platform JWT secret for signing and verification.
 *
 * Reads `JWT_SECRET` directly; if absent, reads the secret from the file path in
 * `JWT_SECRET_FILE` (Docker `_FILE` secret convention). Fails closed — throws if
 * the secret is missing or the known default `change-me` — so the API never
 * starts with a guessable key.
 *
 * Used by BOTH `JwtModule` (signing, auth.module.ts) and `JwtStrategy`
 * (verification, jwt.strategy.ts) so the two halves can never disagree. The old
 * module config silently fell back to a public `DEGRADED-MODE-DO-NOT-USE` secret
 * while the strategy threw — an asymmetric footgun. This removes that asymmetry.
 */
export function resolveJwtSecret(config: ConfigService): string {
  let secret = config.get<string>('JWT_SECRET');
  if (!secret) {
    const secretFile = config.get<string>('JWT_SECRET_FILE');
    if (secretFile) {
      secret = fs.readFileSync(secretFile, 'utf8').trim();
    }
  }
  if (!secret || secret === 'change-me') {
    throw new Error(
      'JWT_SECRET must be set to a non-default value. Set JWT_SECRET or JWT_SECRET_FILE.',
    );
  }
  return secret;
}

/**
 * Read one secret from the environment, or from the file the `*_FILE`
 * sibling points at. Absent means absent — a missing previous secret is
 * the common, healthy state, not an error.
 */
function readSecretVar(
  config: ConfigService,
  name: string,
  fileVar: string,
): string | null {
  const direct = config.get<string>(name);
  if (direct) return direct;
  const file = config.get<string>(fileVar);
  if (file) {
    try {
      return fs.readFileSync(file, 'utf8').trim();
    } catch {
      return null;
    }
  }
  return null;
}

/**
 * The secrets a bearer token may have been signed with, in the order to
 * try them: the current one first, then the one being rotated out.
 *
 * Signing always uses only the current secret (`resolveJwtSecret`).
 * Verification tries the whole list, so a token minted before a rotation
 * keeps working until it would have expired anyway — the rotation itself
 * logs nobody out. `JWT_SECRET_PREV` (or `JWT_SECRET_PREV_FILE`) is set
 * to the old secret for the rotation window, then removed.
 *
 * Every verifier in the platform reads from this one place, so they can
 * never disagree about which keys are live.
 */
export function resolveJwtSecrets(config: ConfigService): string[] {
  const current = resolveJwtSecret(config);
  const previous = readSecretVar(
    config,
    'JWT_SECRET_PREV',
    'JWT_SECRET_PREV_FILE',
  );
  // A previous identical to the current adds nothing; a `change-me`
  // previous is the placeholder the operator forgot to clear.
  if (!previous || previous === current || previous === 'change-me') {
    return [current];
  }
  return [current, previous];
}

/**
 * Resolve the platform's encryption key.
 *
 * Reads `ENCRYPTION_KEY` (base64 of exactly 32 bytes) or the file named by
 * `ENCRYPTION_KEY_FILE`, and **fails closed** — there is no default key.
 *
 * Four services used to carry their own copy of this, each reading the key
 * differently: some took the environment variable as UTF-8 and some as
 * base64, and all four fell back to `default-dev-key-32-chars-here!!` —
 * a key that is published in this repository. A secret encrypted under it
 * is readable by anyone who has read the source, and a secret encrypted by
 * `CryptoService` (base64) could not be decrypted by those services at all.
 *
 * One resolution, one key, and it fails closed.
 */
export function resolveEncryptionKey(config: ConfigService): Buffer {
  let keyBase64 = config.get<string>('ENCRYPTION_KEY');
  if (!keyBase64) {
    const keyFile = config.get<string>('ENCRYPTION_KEY_FILE');
    if (keyFile) {
      keyBase64 = fs.readFileSync(keyFile, 'utf8').trim();
    }
  }
  if (!keyBase64) {
    throw new Error(
      'ENCRYPTION_KEY must be set. Use the ENCRYPTION_KEY_FILE env var.',
    );
  }
  const raw = Buffer.from(keyBase64, 'base64');
  if (raw.length !== 32) {
    throw new Error(
      `ENCRYPTION_KEY must be 32 bytes (got ${raw.length}). Provide a base64-encoded 32-byte key.`,
    );
  }
  return raw;
}
