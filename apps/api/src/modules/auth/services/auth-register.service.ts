import { Injectable, ConflictException } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { EventService } from '@/modules/events/event.service';
import * as bcrypt from 'bcrypt';

const BCRYPT_ROUNDS = 12;

@Injectable()
export class AuthRegisterService {
  constructor(private prisma: PrismaService, private eventService: EventService) {}

  async register(dto: { email: string; password: string; name?: string }, ipAddress?: string, userAgent?: string) {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) throw new ConflictException('Email already registered');

    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);
    const user = await this.prisma.user.create({ data: { email: dto.email, passwordHash, name: dto.name } });

    await this.eventService.emit(
      'identity.user.registered',
      { email: user.email, name: user.name },
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
