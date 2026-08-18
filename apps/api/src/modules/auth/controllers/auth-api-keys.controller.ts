import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { JwtAuthGuard } from '@/modules/auth/jwt-auth.guard';
import { AuthApiKeyService } from '@/modules/auth/services/auth-api-key.service';
import { CreateAccountApiKeyDto } from '@/modules/auth/dto/create-account-api-key.dto';
import { SCOPE_SET } from '@/modules/auth/constants/scope-allowlist';
import type { Request } from 'express';

@Controller('auth/api-keys')
@UseGuards(JwtAuthGuard)
export class AuthApiKeysController {
  constructor(private readonly authApiKeyService: AuthApiKeyService) {}

  @Get()
  async list(@Req() req: Request) {
    const userId = (req.user as { userId: string }).userId;
    const keys = await this.authApiKeyService.getApiKeys(userId);
    return {
      items: keys.map(k => ({
        id: k.id,
        name: k.name,
        keyPrefix: 'fsk_', // prefix is fixed; full key shown only at creation
        permissions: k.permissions ?? [],
        expiresAt: k.expiresAt?.toISOString() ?? null,
        createdAt: k.createdAt.toISOString(),
      })),
    };
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Req() req: Request, @Body() dto: CreateAccountApiKeyDto) {
    const userId = (req.user as { userId: string }).userId;

    // Validate permissions against allowlist
    if (dto.permissions?.length) {
      const invalid = dto.permissions.filter(p => !SCOPE_SET.has(p));
      if (invalid.length) {
        throw new BadRequestException(`Unsupported scopes: ${invalid.join(', ')}`);
      }
    }

    // Reject past expiry dates
    if (dto.expiresAt && new Date(dto.expiresAt) <= new Date()) {
      throw new BadRequestException('expiresAt must be a future date');
    }

    const result = await this.authApiKeyService.createApiKey(userId, {
      name: dto.name,
      permissions: dto.permissions ?? [],
      expiresAt: dto.expiresAt,
    });

    return {
      id: result.apiKey.id,
      name: result.apiKey.name,
      key: result.key, // returned ONLY here, never again
      permissions: (dto.permissions ?? []) as string[],
      expiresAt: dto.expiresAt ?? null,
      createdAt: result.apiKey.createdAt.toISOString(),
    };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async revoke(@Req() req: Request, @Param('id') id: string) {
    const userId = (req.user as { userId: string }).userId;
    const keys = await this.authApiKeyService.getApiKeys(userId);
    const key = keys.find((k: any) => k.id === id);
    if (!key) throw new NotFoundException('API key not found');
    await this.authApiKeyService.revokeApiKey(userId, id);
    return { revoked: true };
  }
}
