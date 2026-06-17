import { Injectable, ConflictException } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { EventService } from '@/modules/events/event.service';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';

const BCRYPT_ROUNDS = 12;

@Injectable()
export class AppAuthRegisterService {
  constructor(private prisma: PrismaService, private eventService: EventService) {}

  async register(projectId: string, dto: any) {
    const existing = await this.prisma.appUser.findFirst({
      where: { projectId, email: dto.email },
    });
    if (existing) throw new ConflictException('User already exists');

    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);
    const user = await this.prisma.appUser.create({
      data: {
        projectId,
        email: dto.email,
        passwordHash,
        name: dto.name,
        verificationToken: crypto.randomBytes(32).toString('hex'),
      },
    });

    await this.eventService.emit('auth.user_created', { userId: user.id, projectId, email: user.email });
    return this.formatUser(user);
  }

  private formatUser(user: any) {
    return {
      id: user.id,
      projectId: user.projectId,
      email: user.email,
      name: user.name,
      emailVerified: user.emailVerified,
      createdAt: user.createdAt,
    };
  }
}
