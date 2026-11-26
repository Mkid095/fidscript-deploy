import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import * as jwt from 'jsonwebtoken';
import { JwtTokenVerifier } from '@/common/jwt-token-verifier.service';
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
    private verifier: JwtTokenVerifier,
    private accessTokens: AccessTokenService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      // The rotation model, on the passport side: the provider hands back
      // whichever of the platform's live secrets the token's signature
      // actually matches, and passport-jwt verifies with that one. A token
      // that matches none of them fails here, not later.
      secretOrKey: ((token: string, cb: (err: Error | null, secret?: string) => void) => {
        for (const secret of verifier.secrets()) {
          try {
            jwt.verify(token, secret, { algorithms: ['HS256'] });
            cb(null, secret);
            return;
          } catch {
            /* the next key in the rotation list */
          }
        }
        cb(new UnauthorizedException('Invalid token signature'));
      }) as never,
    });
  }

  /**
   * The rules a bearer token has to satisfy live in one place —
   * `AccessTokenService` — so that the composite API-key/JWT guard cannot
   * quietly disagree with this strategy about what a token is worth. The
   * signature itself was checked above, against the live secret list.
   */
  async validate(payload: AccessPayload) {
    return this.accessTokens.verifyClaims(payload);
  }
}
