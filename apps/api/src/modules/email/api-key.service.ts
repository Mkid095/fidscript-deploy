import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { EventService } from '../events/event.service';
import { CreateEmailApiKeyDto } from './dto/create-email-api-key.dto';
import * as crypto from 'crypto';
import * as bcrypt from 'bcrypt';

const BCRYPT_ROUNDS = 12;

@Injectable()
export class EmailApiKeyService {
  constructor(
    private prisma: PrismaService,
    private eventService: EventService,
  ) {}

  async createEmailApiKey(projectId: string, dto: CreateEmailApiKeyDto) {
    const rawKey = `ek_${crypto.randomBytes(24).toString('hex')}`;
    const keyHash = await bcrypt.hash(rawKey, BCRYPT_ROUNDS);

    const scopes = dto.scopes?.length ? dto.scopes : ['email.send'];

    const apiKey = await this.prisma.emailApiKey.create({
      data: { projectId, name: dto.name, keyHash, scopes },
    });

    await this.eventService.emit('email.api_key_created', {
      apiKeyId: apiKey.id,
      projectId,
      name: dto.name,
    });

    return {
      id: apiKey.id,
      name: apiKey.name,
      key: rawKey,
      scopes,
      dailyLimit: dto.dailyLimit ?? 1000,
      monthlyLimit: dto.monthlyLimit ?? 30000,
      createdAt: apiKey.createdAt,
    };
  }

  async listEmailApiKeys(projectId: string) {
    return this.prisma.emailApiKey.findMany({
      where: { projectId },
      select: { id: true, name: true, scopes: true, lastUsedAt: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async deleteEmailApiKey(projectId: string, apiKeyId: string) {
    const apiKey = await this.prisma.emailApiKey.findFirst({
      where: { id: apiKeyId, projectId },
    });
    if (!apiKey) throw new NotFoundException('API key not found');

    await this.prisma.emailApiKey.delete({ where: { id: apiKeyId } });

    await this.eventService.emit('email.api_key_deleted', { apiKeyId, projectId });

    return { deleted: true };
  }
}
