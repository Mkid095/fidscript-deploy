import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { resolveJwtSecret } from '@/common/secrets';
import { AccessTokenService } from './services/access-token.service';

interface AccessPayload {
  sub: string;
  email: string;
  role: string;
  type: string;
  sessionId?: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService,
    private accessTokens: AccessTokenService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: resolveJwtSecret(configService),
    });
  }

  /**
   * The rules a bearer token has to satisfy live in one place —
   * `AccessTokenService` — so that the composite API-key/JWT guard cannot
   * quietly disagree with this strategy about what a token is worth.
   */
  async validate(payload: AccessPayload) {
    // The payload has already been verified by passport; the service needs the
    // token itself to check the session and the revocation list, so it is
    // re-signed from the payload's own claims.
    return this.accessTokens.verifyClaims(payload);
  }
}
