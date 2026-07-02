import { Injectable, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { EventService } from '@/modules/events/event.service';
import { AuthMagicCodeService } from '@/modules/auth/services/auth-magic-code.service';
import * as bcrypt from 'bcrypt';

const BCRYPT_ROUNDS = 12;

@Injectable()
export class AuthRegisterService {
  constructor(
    private prisma: PrismaService,
    private eventService: EventService,
    private magicCodeService: AuthMagicCodeService,
  ) {}

  async register(
    dto: { email: string; password?: string; name?: string; authMethod?: 'PASSWORD' | 'MAGIC_CODE' },
    ipAddress?: string,
    userAgent?: string,
  ) {
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
}
