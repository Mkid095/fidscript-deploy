import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { EventService } from '@/modules/events/event.service';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';

const BCRYPT_ROUNDS = 12;

@Injectable()
export class AuthApiKeyService {
  constructor(
    private prisma: PrismaService,
    private eventService: EventService,
  ) {}

  async createApiKey(userId: string, dto: { name: string; permissions?: string[]; expiresAt?: string }) {
    const key = `fsk_${crypto.randomBytes(24).toString('base64url')}`;
    const keyHash = await bcrypt.hash(key, BCRYPT_ROUNDS);

    const apiKey = await this.prisma.apiKey.create({
      data: {
        userId, name: dto.name, keyHash,
        permissions: dto.permissions || [],
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
      },
    });

    await this.eventService.emit('identity.api_key.created', {
      id: crypto.randomUUID(), type: 'identity.api_key.created',
      timestamp: new Date(), actorId: userId, actorType: 'user',
      resourceType: 'api_key', resourceId: apiKey.id, metadata: { name: dto.name },
    });

    return { apiKey, key };
  }

  async getApiKeys(userId: string) {
    return this.prisma.apiKey.findMany({
      where: { userId },
      select: { id: true, name: true, permissions: true, lastUsedAt: true, expiresAt: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async revokeApiKey(userId: string, keyId: string) {
    const apiKey = await this.prisma.apiKey.findFirst({ where: { id: keyId, userId } });
    if (!apiKey) throw new NotFoundException('API key not found');

    await this.prisma.apiKey.delete({ where: { id: keyId } });

    await this.eventService.emit('identity.api_key.revoked', {
      id: crypto.randomUUID(), type: 'identity.api_key.revoked',
      timestamp: new Date(), actorId: userId, actorType: 'user',
      resourceType: 'api_key', resourceId: keyId, metadata: { name: apiKey.name },
    });
  }

  async validateApiKey(key: string): Promise<{ userId: string; permissions: string[] } | null> {
    const apiKeys = await this.prisma.apiKey.findMany({ where: { expiresAt: { gt: new Date() } } });
    for (const apiKey of apiKeys) {
      if (await bcrypt.compare(key, apiKey.keyHash)) {
        await this.prisma.apiKey.update({
          where: { id: apiKey.id },
          data: { lastUsedAt: new Date() },
        });
        return { userId: apiKey.userId, permissions: apiKey.permissions as string[] };
      }
    }
    return null;
  }
}
