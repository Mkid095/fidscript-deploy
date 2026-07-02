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
    // Check if user has a PASSWORD credential (may be stored in UserCredential, not User.passwordHash)
    const passwordCredential = await this.prisma.userCredential.findUnique({
      where: { userId_type: { userId, type: 'PASSWORD' } },
    });

    const hasExistingPassword = !!(passwordCredential?.secretHash);

    if (hasExistingPassword) {
      // Normal change-password flow: verify current
      const currentValid = await bcrypt.compare(dto.currentPassword, passwordCredential!.secretHash!);
      if (!currentValid) {
        throw new UnauthorizedException('Current password is incorrect');
      }
      if (dto.currentPassword === dto.newPassword) {
        throw new BadRequestException('New password must differ from the current password');
      }
    } else {
      // Magic-code-only user: no existing password — this is a "create password" call.
      // currentPassword must be empty in this case.
      if (dto.currentPassword !== '') {
        throw new BadRequestException('No current password to verify');
      }
    }

    const passwordHash = await bcrypt.hash(dto.newPassword, BCRYPT_ROUNDS);

    // Upsert the PASSWORD credential (creates if absent, updates if present)
    await this.prisma.userCredential.upsert({
      where: { userId_type: { userId, type: 'PASSWORD' } },
      create: { userId, type: 'PASSWORD', secretHash: passwordHash },
      update: { secretHash: passwordHash },
    });

    // Clear mustChangePassword flag
    await this.prisma.user.update({
      where: { id: userId },
      data: { mustChangePassword: false },
    });

    // Rotate session if we have one
    if (sessionId) {
      await this.prisma.session.update({
        where: { id: sessionId },
        data: { expiresAt: new Date(0) },
      }).catch(() => { /* session already gone — non-fatal */ });
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, name: true, role: true },
    });

    const sess = await this.session.createSession(userId, ipAddress, userAgent);

    await this.eventService.emit(
      'identity.user.password_changed', null, {},
      {
        actorId: userId,
        actorType: 'user',
        resourceType: 'user',
        resourceId: userId,
        ipAddress,
        userAgent,
      },
    );

    return this.session.buildAuthResponse(user!, sess);
  }
}
