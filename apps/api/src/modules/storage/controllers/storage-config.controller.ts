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
import { ProjectMemberGuard } from '@/modules/auth/guards/project-member.guard';
import { StorageConfigService } from '@/modules/storage/services/storage-config.service';
import { StorageCredentialsService } from '@/modules/storage/services/storage-credentials.service';
import { StorageProviderFactory } from '@/modules/storage/providers/storage-provider.factory';
import { Request } from 'express';

@ApiTags('storage-config')
@Controller('projects/:projectId/storage')
@UseGuards(ApiKeyOrJwtGuard, ProjectMemberGuard)
@ApiBearerAuth()
export class StorageConfigController {
  constructor(
    private configService: StorageConfigService,
    private credentials: StorageCredentialsService,
    private providers: StorageProviderFactory,
  ) {}

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

  @Post('credentials/cloudinary/test')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Test Cloudinary credentials without saving' })
  async testCloudinaryCredentials(
    @Param('projectId') projectId: string,
    @Body() body: { cloudName: string; apiKey: string; apiSecret: string },
  ) {
    const provider = this.providers.get('cloudinary');
    const result = await provider.testConnection({
      cloudName: body.cloudName,
      apiKey: body.apiKey,
      apiSecret: body.apiSecret,
    });
    return result;
  }

  @Post('credentials/telegram/test')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Test Telegram credentials without saving' })
  async testTelegramCredentials(
    @Param('projectId') projectId: string,
    @Body() body: { botToken: string; chatId: string },
  ) {
    const provider = this.providers.get('telegram');
    const result = await provider.testConnection({
      botToken: body.botToken,
      chatId: body.chatId,
    });
    return result;
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