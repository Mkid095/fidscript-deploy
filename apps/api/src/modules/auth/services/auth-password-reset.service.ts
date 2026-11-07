import { Injectable, Logger } from '@nestjs/common';
import { BadRequestException, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { EventService } from '@/modules/events/event.service';
import { AuthSessionService } from '@/modules/auth/services/auth-session.service';
import * as bcrypt from 'bcrypt';

const BCRYPT_ROUNDS = 12;

/**
 * The two flows that end in a session or a new password: the password reset
 * and the magic sign-in link.
 *
 * **The reset used to change nothing that mattered.** It wrote the
 * `UserCredential` row, but login reads `User.passwordHash` — so the new
 * password was accepted by nothing and the account was locked out of its own
 * reset. Both columns are written now.
 */
@Injectable()
export class AuthPasswordResetService {
  private readonly logger = new Logger(AuthPasswordResetService.name);

  constructor(
    private prisma: PrismaService,
    private eventService: EventService,
    private session: AuthSessionService,
  ) {}

  /** Sets a new password from a reset token, and ends every session. */
  async confirm(dto: { token: string; newPassword: string }, ipAddress?: string, userAgent?: string) {
    const record = await this.prisma.verificationToken.findUnique({
      where: { token: dto.token },
    });
    if (!record) throw new UnauthorizedException('Invalid or expired token');
    if (record.consumed) throw new BadRequestException('Token already used');
    if (record.type !== 'PASSWORD_RESET') {
      throw new BadRequestException('Token is not a password reset token');
    }
    if (record.expiresAt < new Date()) throw new UnauthorizedException('Token has expired');

    const user = await this.prisma.user.findUnique({ where: { id: record.userId } });
    if (!user) throw new NotFoundException('User not found');

    const passwordHash = await bcrypt.hash(dto.newPassword, BCRYPT_ROUNDS);

    // BOTH columns. Login verifies against `User.passwordHash`; the
    // credential table is what the rest of the platform reads. Writing only
    // one of them is how the reset used to leave the account locked out.
    await this.prisma.userCredential.upsert({
      where: { userId_type: { userId: user.id, type: 'PASSWORD' } },
      create: { userId: user.id, type: 'PASSWORD', secretHash: passwordHash },
      update: { secretHash: passwordHash },
    });
    await this.prisma.user.update({
      where: { id: user.id },
      data: { passwordHash, mustChangePassword: false },
    });

    await this.prisma.verificationToken.update({
      where: { id: record.id },
      data: { consumed: true },
    });

    // A reset ends every session, including the one that asked for it.
    await this.prisma.session.updateMany({
      where: { userId: user.id, expiresAt: { gt: new Date(0) } },
      data: { expiresAt: new Date(0) },
    });

    await this.eventService.emit('identity.user.password_reset_completed', null, {}, {
      actorId: user.id,
      actorType: 'user',
      resourceType: 'user',
      resourceId: user.id,
      ipAddress,
      userAgent,
    });

    return { success: true };
  }

  /** Confirms a magic link and signs the person in. */
  async confirmMagicLink(dto: { token: string }, ipAddress?: string, userAgent?: string) {
    const record = await this.prisma.verificationToken.findUnique({
      where: { token: dto.token },
    });
    if (!record) throw new UnauthorizedException('Invalid or expired link');
    if (record.consumed) throw new BadRequestException('Link already used');
    if (record.type !== 'MAGIC_LINK') throw new BadRequestException('Token is not a magic link');
    if (record.expiresAt < new Date()) throw new UnauthorizedException('Link has expired');

    const user = await this.prisma.user.findUnique({ where: { id: record.userId } });
    if (!user) throw new NotFoundException('User not found');

    await this.prisma.verificationToken.update({
      where: { id: record.id },
      data: { consumed: true },
    });
    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    await this.eventService.emit('identity.user.magic_link_verified', null, { email: user.email }, {
      actorId: user.id,
      actorType: 'user',
      resourceType: 'user',
      resourceId: user.id,
      ipAddress,
      userAgent,
    });

    const sess = await this.session.createSession(user.id, ipAddress, userAgent);
    return this.session.buildAuthResponse(user, sess);
  }
}
