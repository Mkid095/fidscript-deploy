import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as jwt from 'jsonwebtoken';
import { resolveJwtSecrets } from '@/common/secrets';

/**
 * Verifying a platform token against the rotation list.
 *
 * One place decides whether a bearer token is worth anything: the signature
 * is checked against the current secret and, during a rotation window, the
 * one being retired — and the check is for the algorithm the platform signs
 * with, never for "whatever the token claims". Every verifier in the API
 * (the session strategy, the API-key guard, the refresh path) goes through
 * here, so a rotation changes one list and no caller.
 */
@Injectable()
export class JwtTokenVerifier {
  constructor(private config: ConfigService) {}

  /**
   * The live secret list, read on every call: a rotation (write the new
   * secret, restart the API) is picked up without touching this service.
   * The passport strategies hand it to the JWT provider — the one that
   * matches the token's signature is the one passport verifies with.
   */
  secrets(): string[] {
    return resolveJwtSecrets(this.config);
  }

  /**
   * Verify the token's signature and expiration against the live secrets.
   *
   * Throws `UnauthorizedException` with the reason that is true — an
   * expired token is not the same news as a bad signature, and the caller
   * is allowed to say which one happened.
   */
  verify(token: string): jwt.JwtPayload {
    let expired = false;
    for (const secret of this.secrets()) {
      try {
        // The platform signs HS256 and verifies HS256, named: a token that
        // declares another algorithm is refused, not accepted.
        return jwt.verify(token, secret, { algorithms: ['HS256'] }) as jwt.JwtPayload;
      } catch (err) {
        const name = err instanceof jwt.TokenExpiredError ? err.name : undefined;
        if (name === 'TokenExpiredError') expired = true;
        // No secret matched; try the next one, and remember whether any of
        // the attempts was "the right key, too late".
      }
    }
    if (expired) throw new UnauthorizedException('Token expired');
    throw new UnauthorizedException('Invalid token signature');
  }

  async verifyAsync(token: string): Promise<jwt.JwtPayload> {
    return this.verify(token);
  }
}
