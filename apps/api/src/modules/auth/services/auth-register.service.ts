import { Injectable, ConflictException, BadRequestException, UnauthorizedException, Logger } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { EventService } from '@/modules/events/event.service';
import { AuthMagicCodeService } from '@/modules/auth/services/auth-magic-code.service';
import { AuthOnboardingService } from '@/modules/auth/services/auth-onboarding.service';
import { AuthSetupPasswordService } from '@/modules/auth/services/auth-setup-password.service';
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
    private setupPassword: AuthSetupPasswordService,
  ) {}

  /**
   * Whether the platform has a company password set.
   *
   * It is a bcrypt hash in the platform's own settings — set by the
   * operator during setup, so it travels with the platform rather than with
   * an environment variable.
   */
  private async hasSetupPassword(): Promise<boolean> {
    return this.setupPassword.isConfigured();
  }

  /**
   * Check the company password, when the platform has one.
   *
   * Without one, registration is open — the same meaning the old
   * SIGNUP_INVITE_KEYWORD had when it was unset.
   */
  private async assertSignupAllowed(setupPassword?: string): Promise<void> {
    if (await this.setupPassword.allows(setupPassword)) return;
    throw new UnauthorizedException('The company password is wrong.');
  }

  async register(
    dto: {
      email: string;
      password?: string;
      name?: string;
      firstName?: string;
      lastName?: string;
      authMethod?: 'PASSWORD' | 'MAGIC_CODE';
      inviteKeyword?: string;
      setupPassword?: string;
    },
    ipAddress?: string,
    userAgent?: string,
  ) {
    await this.assertSignupAllowed(dto.setupPassword);

    const requiredKeyword = process.env['SIGNUP_INVITE_KEYWORD']?.trim();
    if (requiredKeyword && !(await this.hasSetupPassword())) {
      if (!dto.inviteKeyword || dto.inviteKeyword.trim().toLowerCase() !== requiredKeyword.toLowerCase()) {
        throw new UnauthorizedException('Invalid or missing invite keyword');
      }
    } else if (!requiredKeyword && process.env['NODE_ENV'] === 'production') {
      // No invite gate set in production → log loudly. The onboarding service
      // below ensures every signup still has a usable workspace. The operator
      // can set SIGNUP_INVITE_KEYWORD to close registration later.
      this.logger.warn(
        'SIGNUP_INVITE_KEYWORD is unset in production — open registration is enabled. ' +
        'Set SIGNUP_INVITE_KEYWORD to restrict who can register.',
      );
    }
    const authMethod = dto.authMethod ?? 'PASSWORD';
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email.toLowerCase().trim() } });
    if (existing) throw new ConflictException('Email already registered');

    if (authMethod === 'PASSWORD' && !dto.password) {
      throw new BadRequestException('Password is required when authMethod is PASSWORD');
    }
    if (authMethod === 'MAGIC_CODE' && dto.password) {
      throw new BadRequestException('Password should not be set when authMethod is MAGIC_CODE');
    }

    const passwordHash = dto.password ? await bcrypt.hash(dto.password, BCRYPT_ROUNDS) : null;

    // A person signs up with a first and a last name; the account carries
    // them together, and either part may be missing.
    const given = [dto.firstName, dto.lastName].filter(Boolean).join(' ');
    const fullName = dto.name ?? (given || undefined);

    const user = await this.prisma.user.create({
      data: {
        email: dto.email.toLowerCase().trim(),
        passwordHash,
        name: fullName,
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
