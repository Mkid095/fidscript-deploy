import { Injectable, ConflictException, BadRequestException, UnauthorizedException, Logger } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { EventService } from '@/modules/events/event.service';
import { AuthMagicCodeService } from '@/modules/auth/services/auth-magic-code.service';
import { AuthOnboardingService } from '@/modules/auth/services/auth-onboarding.service';
import * as bcrypt from 'bcrypt';

const BCRYPT_ROUNDS = 12;

@Injectable()
export class AuthRegisterService {
  private readonly logger = new Logger(AuthRegisterService.name);

  constructor(
    private prisma: PrismaService,
    private eventService: EventService,
    private magicCodeService: AuthMagicCodeService,
    private onboarding: AuthOnboardingService,
  ) {}

  async register(
    dto: { email: string; password?: string; name?: string; authMethod?: 'PASSWORD' | 'MAGIC_CODE'; inviteKeyword?: string },
    ipAddress?: string,
    userAgent?: string,
  ) {
    const requiredKeyword = process.env['SIGNUP_INVITE_KEYWORD']?.trim();
    if (requiredKeyword) {
      if (!dto.inviteKeyword || dto.inviteKeyword.trim().toLowerCase() !== requiredKeyword.toLowerCase()) {
        throw new UnauthorizedException('Invalid or missing invite keyword');
      }
    } else if (process.env['NODE_ENV'] === 'production') {
      // No invite gate set in production → log loudly. The onboarding service
      // below ensures every signup still has a usable workspace. The operator
      // can set SIGNUP_INVITE_KEYWORD to close registration later.
      this.logger.warn(
        'SIGNUP_INVITE_KEYWORD is unset in production — open registration is enabled. ' +
        'Set SIGNUP_INVITE_KEYWORD to restrict who can register.',
      );
    }
    const authMethod = dto.authMethod ?? 'PASSWORD';
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) throw new ConflictException('Email already registered');

    if (authMethod === 'PASSWORD' && !dto.password) {
      throw new BadRequestException('Password is required when authMethod is PASSWORD');
    }
    if (authMethod === 'MAGIC_CODE' && dto.password) {
      throw new BadRequestException('Password should not be set when authMethod is MAGIC_CODE');
    }

    const passwordHash = dto.password ? await bcrypt.hash(dto.password, BCRYPT_ROUNDS) : null;

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        passwordHash,
        name: dto.name,
        preferredAuthMethod: authMethod,
        mustChangePassword: authMethod === 'MAGIC_CODE',
      },
    });

    await this.eventService.emit(
      'identity.user.registered', null,
      { email: user.email, name: user.name, authMethod },
      {
        actorId: user.id,
        actorType: 'user',
        resourceType: 'user',
        resourceId: user.id,
        ipAddress,
        userAgent,
      },
    );

    return user;
  }

  async provisionForNewUser(userId: string, email: string) {
    return this.onboarding.provisionDefaults(userId, email);
  }
}
