import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { EventService } from '@/modules/events/event.service';
import { CryptoService } from '@/modules/crypto/crypto.service';
import { AuthProviderName } from '@prisma/client';

export interface UpsertAuthProviderDto {
  clientId: string;
  clientSecret: string;
  enabled?: boolean;
  scopes?: string[];
  redirectUri?: string;
}

const VALID_PROVIDERS: AuthProviderName[] = ['GOOGLE', 'GITHUB'];
// MOCK is a special case — not stored in DB; handled at runtime by OAuthService.

@Injectable()
export class AuthProvidersService {
  constructor(
    private prisma: PrismaService,
    private eventService: EventService,
    private cryptoService: CryptoService,
  ) {}

  private assertProvider(provider: string): AuthProviderName {
    const upper = provider.toUpperCase();
    if (upper === 'MOCK') {
      throw new BadRequestException('MOCK is not a managed OAuth provider — it is only available for the authorize flow without configuration.');
    }
    if (!VALID_PROVIDERS.includes(upper as AuthProviderName)) {
      throw new BadRequestException(`Unsupported OAuth provider: ${provider}. Supported: ${VALID_PROVIDERS.join(', ')}`);
    }
    return upper as AuthProviderName;
  }

  /** List configured providers with secrets masked. */
  async list(projectId: string) {
    const rows = await this.prisma.authProvider.findMany({
      where: { projectId },
      orderBy: { provider: 'asc' },
    });
    return {
      providers: rows.map((r) => this.maskSecrets(r)),
    };
  }

  /** Upsert a provider's encrypted config. Project-admin gated. */
  async upsert(
    projectId: string,
    provider: string,
    dto: UpsertAuthProviderDto,
    actorId: string,
    ipAddress?: string,
    userAgent?: string,
  ) {
    const providerEnum = this.assertProvider(provider);
    if (!dto.clientId || !dto.clientSecret) {
      throw new BadRequestException('clientId and clientSecret are required');
    }
    const encryptedClientId = this.cryptoService.encrypt(dto.clientId);
    const encryptedClientSecret = this.cryptoService.encrypt(dto.clientSecret);
    const scopes = dto.scopes ?? [];

    const row = await this.prisma.authProvider.upsert({
      where: { projectId_provider: { projectId, provider: providerEnum } },
      create: {
        projectId,
        provider: providerEnum,
        enabled: dto.enabled ?? true,
        encryptedClientId,
        encryptedClientSecret,
        scopes,
        redirectUri: dto.redirectUri ?? null,
      },
      update: {
        encryptedClientId,
        encryptedClientSecret,
        enabled: dto.enabled ?? true,
        scopes,
        redirectUri: dto.redirectUri ?? null,
      },
    });

    await this.eventService.emit('auth.provider_configured', {
      projectId,
      provider: providerEnum,
      scopes: scopes.length,
      hasRedirectUri: !!dto.redirectUri,
    }, { actorId, ipAddress, userAgent });

    return this.maskSecrets(row);
  }

  /** Delete a provider config. */
  async remove(
    projectId: string,
    provider: string,
    actorId: string,
    ipAddress?: string,
    userAgent?: string,
  ) {
    const providerEnum = this.assertProvider(provider);
    const existing = await this.prisma.authProvider.findUnique({
      where: { projectId_provider: { projectId, provider: providerEnum } },
    });
    if (!existing) throw new NotFoundException(`Provider ${provider} not configured for project`);
    await this.prisma.authProvider.delete({
      where: { projectId_provider: { projectId, provider: providerEnum } },
    });
    await this.eventService.emit('auth.provider_removed', {
      projectId,
      provider: providerEnum,
    }, { actorId, ipAddress, userAgent });
    return { success: true };
  }

  /** Decrypt to in-memory values (used by OAuthService). Never exposed via API. */
  async getDecrypted(projectId: string, provider: AuthProviderName): Promise<{ clientId: string; clientSecret: string } | null> {
    const row = await this.prisma.authProvider.findUnique({
      where: { projectId_provider: { projectId, provider } },
    });
    if (!row) return null;
    return {
      clientId: this.cryptoService.decrypt(row.encryptedClientId),
      clientSecret: this.cryptoService.decrypt(row.encryptedClientSecret),
    };
  }

  private maskSecrets(row: any) {
    const clientId = this.cryptoService.decrypt(row.encryptedClientId);
    const hasSecret = !!row.encryptedClientSecret && row.encryptedClientSecret !== 'PLACEHOLDER';
    const clientIdMasked =
      clientId.length <= 8
        ? '*'.repeat(clientId.length)
        : `${clientId.slice(0, 4)}...${clientId.slice(-4)}`;
    return {
      provider: row.provider,
      enabled: row.enabled,
      clientIdMasked,
      hasSecret,
      scopes: row.scopes,
      redirectUri: row.redirectUri,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }
}