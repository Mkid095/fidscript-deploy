/**
 * Admin controller for the platform-wide email attachment storage backend.
 *
 * Routes:
 *   GET    /admin/attachment-config           — public config (no credentials)
 *   PUT    /admin/attachment-config           — update backend + credentials
 *   POST   /admin/attachment-config/test      — test connectivity to the backend
 *   GET    /admin/attachment-config/attachments/:id   — get download URL for a stored attachment
 *   GET    /admin/attachment-config/messages/:messageId  — list stored attachments for a message
 *
 * Auth: platform admins only (JwtAuthGuard + PlatformAdminGuard + ADMIN/OWNER roles).
 */
import {
  Controller, Get, Put, Post, Body, Param, UseGuards, HttpCode, HttpStatus,
  BadRequestException, ForbiddenException,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '@/modules/auth/jwt-auth.guard';
import { PlatformAdminGuard } from '@/modules/auth/guards/platform-admin.guard';
import { Roles } from '@/modules/auth/guards/roles.decorator';
import { Role } from '@prisma/client';
import { AttachmentConfigService } from '@/modules/email/services/attachment-config.service';
import { AttachmentStorageService } from '@/modules/email/services/attachment-storage.service';

import { IsString, IsIn, IsOptional, IsObject } from 'class-validator';

// ── DTOs ──────────────────────────────────────────────────────────────────────

class UpdateConfigDto {
  @IsString()
  @IsIn(['internal', 'telegram', 'cloudinary'])
  provider!: 'internal' | 'telegram' | 'cloudinary';

  /** Raw credentials object — validated at the service layer. */
  @IsOptional()
  @IsObject()
  credentials?: Record<string, unknown>;
}

class TestConfigDto {
  @IsString()
  @IsIn(['internal', 'telegram', 'cloudinary'])
  provider!: 'internal' | 'telegram' | 'cloudinary';

  @IsOptional()
  @IsObject()
  credentials?: Record<string, unknown>;
}

// ── Controller ────────────────────────────────────────────────────────────────

@ApiTags('admin-attachment-config')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PlatformAdminGuard)
@Roles(Role.ADMIN, Role.OWNER)
@Controller('admin/attachment-config')
export class AttachmentConfigController {
  constructor(
    private readonly configService: AttachmentConfigService,
    private readonly storage: AttachmentStorageService,
  ) {}

  /** GET /admin/attachment-config — safe public view (no secrets). */
  @Get()
  async getConfig() {
    return this.configService.getPublic();
  }

  /** PUT /admin/attachment-config — update the backend and/or credentials. */
  @Put()
  @HttpCode(HttpStatus.OK)
  async updateConfig(@Body() body: UpdateConfigDto) {
    if (!body.provider) throw new BadRequestException('provider required');
    if (body.provider !== 'internal' && !body.credentials) {
      throw new BadRequestException(`${body.provider} requires credentials`);
    }
    await this.configService.update({ provider: body.provider, credentials: body.credentials as any });
    return this.configService.getPublic();
  }

  /** POST /admin/attachment-config/test — validate connectivity to the chosen backend. */
  @Post('test')
  @HttpCode(HttpStatus.OK)
  async testConfig(@Body() body: TestConfigDto) {
    if (!body.provider) throw new BadRequestException('provider required');
    if (body.provider !== 'internal' && !body.credentials) {
      throw new BadRequestException(`${body.provider} requires credentials`);
    }
    const result = await this.configService.testConnection(body.provider, body.credentials as any);
    if (!result.ok) throw new ForbiddenException(result.message);
    return result;
  }

  /** GET /admin/attachment-config/messages/:messageId — list stored attachments for a message. */
  @Get('messages/:messageId')
  async listForMessage(
    @Param('messageId') messageId: string,
  ) {
    return this.storage.listForMessage(messageId);
  }

  /** GET /admin/attachment-config/attachments/:id — get a download URL for a stored attachment. */
  @Get('attachments/:id')
  async getDownloadUrl(@Param('id') id: string) {
    const url = await this.storage.getDownloadUrl(id);
    return { url };
  }
}