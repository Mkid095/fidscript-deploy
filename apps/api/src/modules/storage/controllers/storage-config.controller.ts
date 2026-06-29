import {
  Controller,
  Get,
  Patch,
  Post,
  Delete,
  Param,
  Body,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ApiKeyOrJwtGuard } from '@/modules/auth/guards/api-key-or-jwt.guard';
import { StorageConfigService } from '@/modules/storage/services/storage-config.service';
import { Request } from 'express';

@ApiTags('storage-config')
@Controller('projects/:projectId/storage')
@UseGuards(ApiKeyOrJwtGuard)
@ApiBearerAuth()
export class StorageConfigController {
  constructor(private configService: StorageConfigService) {}

  @Get('config')
  @ApiOperation({ summary: 'Get project storage configuration' })
  async getConfig(@Param('projectId') projectId: string) {
    return this.configService.getOrCreateConfig(projectId);
  }

  @Patch('config')
  @ApiOperation({ summary: 'Update project storage configuration' })
  async updateConfig(
    @Param('projectId') projectId: string,
    @Body() body: { defaultProvider?: string },
  ) {
    return this.configService.updateConfig(projectId, body);
  }

  @Post('credentials/cloudinary')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Set Cloudinary storage credentials' })
  async setCloudinaryCredentials(
    @Param('projectId') projectId: string,
    @Body() body: { cloudName: string; apiKey: string; apiSecret: string },
  ) {
    return this.configService.setCredentials(projectId, 'cloudinary', body);
  }

  @Post('credentials/telegram')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Set Telegram storage credentials' })
  async setTelegramCredentials(
    @Param('projectId') projectId: string,
    @Body() body: { botToken: string; chatId: string },
  ) {
    return this.configService.setCredentials(projectId, 'telegram', body);
  }

  @Delete('credentials/:provider')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete storage credentials for a provider' })
  async deleteCredentials(
    @Param('projectId') projectId: string,
    @Param('provider') provider: 'cloudinary' | 'telegram',
  ) {
    return this.configService.deleteCredentials(projectId, provider);
  }
}