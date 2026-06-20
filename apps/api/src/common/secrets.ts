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
