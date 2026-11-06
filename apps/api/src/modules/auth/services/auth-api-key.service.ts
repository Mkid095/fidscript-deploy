import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { EventService } from '@/modules/events/event.service';
import { SCOPE_SET } from '@/modules/auth/constants/scope-allowlist';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';

const BCRYPT_ROUNDS = 12;

/**
 * Account API keys (`fsk_`).
 *
 * Two things were wrong here:
 *
 *  - **The scope allowlist lived in a controller that never ran.** The
 *    validating controller was registered after another one that declared
 *    the same paths, so the request went to the controller without the
 *    check and any string was accepted as a scope. The validation is here
 *    now, where it cannot be bypassed by route ordering.
 *  - **A key with no expiry could never authenticate.** The rows were
 *    created with `expiresAt: null` and the lookup asked for
 *    `expiresAt > now()`, which SQL excludes for NULL — so every
 *    non-expiring key was permanently invalid.
 */
@Injectable()
export class AuthApiKeyService {
  constructor(
    private prisma: PrismaService,
    private eventService: EventService,
  ) {}

  async createApiKey(userId: string, dto: { name: string; permissions?: string[]; expiresAt?: string }) {
    // Only the scopes the platform knows are accepted. A key cannot be
    // minted with a scope that no route will ever check.
    const permissions = dto.permissions ?? [];
    const invalid = permissions.filter(p => !SCOPE_SET.has(p));
    if (invalid.length > 0) {
      throw new BadRequestException(`Unsupported scopes: ${invalid.join(', ')}`);
    }
    if (dto.expiresAt && new Date(dto.expiresAt) <= new Date()) {
      throw new BadRequestException('expiresAt must be a future date');
    }

    const key = `fsk_${crypto.randomBytes(24).toString('base64url')}`;
    const keyHash = await bcrypt.hash(key, BCRYPT_ROUNDS);

    const apiKey = await this.prisma.apiKey.create({
      data: {
        userId, name: dto.name, keyHash,
        permissions,
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
      },
    });

    await this.eventService.emit('identity.api_key.created', null, { name: dto.name, apiKeyId: apiKey.id });

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

    await this.eventService.emit('identity.api_key.revoked', null, { name: apiKey.name, apiKeyId: keyId });
  }

  async validateApiKey(key: string): Promise<{ userId: string; permissions: string[] } | null> {
    // A key with no expiry is valid for ever, so the lookup has to include
    // the NULL rows — `expiresAt > now()` excludes them, which made every
    // non-expiring key unusable.
    const apiKeys = await this.prisma.apiKey.findMany({
      where: { OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] },
      select: { id: true, userId: true, keyHash: true, permissions: true },
    });
    for (const apiKey of apiKeys) {
      if (await bcrypt.compare(key, apiKey.keyHash)) {
        await this.prisma.apiKey.update({
          where: { id: apiKey.id },
          data: { lastUsedAt: new Date() },
        });
        return { userId: apiKey.userId, permissions: (apiKey.permissions ?? []) as string[] };
      }
    }
    return null;
  }
}
