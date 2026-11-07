import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { EventService } from '@/modules/events/event.service';
import { JwtBlocklistService } from '@/common/jwt-blocklist.service';

// Access JWT TTL — must match JwtModule.signOptions.expiresIn in
// auth.module.ts. The blocklist tombstone expires with the token.
const ACCESS_TOKEN_TTL_SEC = 15 * 60;

/**
 * Signing out.
 *
 * The session is closed and the access token is tombstoned in Redis for the
 * rest of its life. The failure to close the session used to be swallowed —
 * which left the refresh token alive: the access token died, but a captured
 * refresh token could mint a new session after the person had signed out.
 */
@Injectable()
export class AuthLogoutService {
  private readonly logger = new Logger(AuthLogoutService.name);

  constructor(
    private prisma: PrismaService,
    private eventService: EventService,
    private jwtBlocklist: JwtBlocklistService,
  ) {}

  async logout(sessionId: string, userId: string): Promise<void> {
    try {
      await this.prisma.session.update({
        where: { id: sessionId },
        data: { expiresAt: new Date(0) },
      });
    } catch (err) {
      this.logger.error(
        `Could not revoke session ${sessionId} on logout: ${(err as Error).message}`,
      );
      throw new UnauthorizedException('Could not sign you out — try again');
    }

    // Revoke the in-flight access JWT. The tombstone lives as long as the
    // token can, so it cannot be replayed.
    await this.jwtBlocklist.revoke(sessionId, ACCESS_TOKEN_TTL_SEC);

    await this.eventService.emit(
      'identity.user.logged_out', null, {},
      { actorId: userId, actorType: 'user', resourceType: 'session', resourceId: sessionId },
    );
  }
}
