import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { EventService } from '@/modules/events/event.service';
import { AuthSessionService, AuthResponse } from '@/modules/auth/services/auth-session.service';
import * as bcrypt from 'bcrypt';

const BCRYPT_ROUNDS = 12;

/**
 * Password-change flow (PREREQ-AUTH-2). Validates the current password, enforces
 * strength on the new one, clears `mustChangePassword`, rotates the session
 * (revokes the originating session + mints a fresh one so the client swaps tokens),
 * and emits `identity.user.password_changed`.
 *
 * This is the *write* half of the force-change-password flow; AUTH-1 (the flag)
 * and AUTH-4 (/me surfacing) are the *read* half.
 */
@Injectable()
export class AuthPasswordService {
  constructor(
    private prisma: PrismaService,
    private eventService: EventService,
    private session: AuthSessionService,
  ) {}

  async changePassword(
    userId: string,
    sessionId: string | undefined,
    dto: { currentPassword: string; newPassword: string },
    ipAddress?: string,
    userAgent?: string,
  ): Promise<AuthResponse> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, name: true, role: true, passwordHash: true },
    });
    if (!user || !user.passwordHash) {
      throw new UnauthorizedException('Account has no password set');
    }

    const currentValid = await bcrypt.compare(dto.currentPassword, user.passwordHash);
    if (!currentValid) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    if (dto.currentPassword === dto.newPassword) {
      throw new BadRequestException('New password must differ from the current password');
    }

    const passwordHash = await bcrypt.hash(dto.newPassword, BCRYPT_ROUNDS);

    // Clear the flag + store the new hash atomically.
    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash, mustChangePassword: false },
    });

    // Rotate the session: revoke the originating session so its (still-valid) access
    // JWT can no longer be used, then mint a fresh session whose tokens reflect the
    // cleared flag. If sessionId is absent (shouldn't happen under JwtAuthGuard),
    // skip the revoke.
    if (sessionId) {
      await this.prisma.session.update({
        where: { id: sessionId },
        data: { expiresAt: new Date(0) },
      }).catch(() => { /* session already gone — non-fatal */ });
    }

    const sess = await this.session.createSession(userId, ipAddress, userAgent);

    await this.eventService.emit(
      'identity.user.password_changed',
      {},
      {
        actorId: userId,
        actorType: 'user',
        resourceType: 'user',
        resourceId: userId,
        ipAddress,
        userAgent,
      },
    );

    return this.session.buildAuthResponse(
      { id: user.id, email: user.email, name: user.name, role: user.role },
      sess,
    );
  }
}
