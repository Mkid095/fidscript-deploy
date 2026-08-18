import { Controller, Get, Post, Patch, Delete, Param, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '@/modules/auth/jwt-auth.guard';
import { ApiKeyOrJwtGuard } from '@/modules/auth/guards/api-key-or-jwt.guard';
import { ProjectMemberGuard } from '@/modules/auth/guards/project-member.guard';
import { ScopeGuard } from '@/modules/auth/guards/scope-guard';
import { RequireScope } from '@/modules/auth/decorators/require-scope.decorator';
import { NotificationChannelService } from '@/modules/monitoring/services/notification-channel.service';
import { CreateNotificationChannelDto, UpdateNotificationChannelDto } from '@/modules/monitoring/dto/index';

@ApiTags('monitoring/channels')
@Controller('projects/:projectId/monitoring/channels')
@UseGuards(ApiKeyOrJwtGuard, ScopeGuard, ProjectMemberGuard)
@ApiBearerAuth()
export class NotificationChannelsController {
  constructor(private channels: NotificationChannelService) {}

  @Post()
  @RequireScope('monitoring:write')
  async createNotificationChannel(@Param('projectId') projectId: string, @Body() dto: CreateNotificationChannelDto) {
    return this.channels.createNotificationChannel(projectId, dto);
  }

  @Get()
  @RequireScope('monitoring:read')
  async listNotificationChannels(@Param('projectId') projectId: string) {
    const channels = await this.channels.listNotificationChannels(projectId);
    return { channels };
  }

  @Get(':channelId')
  @RequireScope('monitoring:read')
  async getNotificationChannel(@Param('projectId') projectId: string, @Param('channelId') channelId: string) {
    return this.channels.getNotificationChannel(projectId, channelId);
  }

  @Patch(':channelId')
  @RequireScope('monitoring:write')
  async updateNotificationChannel(
    @Param('projectId') projectId: string,
    @Param('channelId') channelId: string,
    @Body() dto: UpdateNotificationChannelDto,
  ) {
    return this.channels.updateNotificationChannel(projectId, channelId, dto);
  }

  @Delete(':channelId')
  @RequireScope('monitoring:write')
  async deleteNotificationChannel(@Param('projectId') projectId: string, @Param('channelId') channelId: string) {
    return this.channels.deleteNotificationChannel(projectId, channelId);
  }

  @Post(':channelId/test')
  @RequireScope('monitoring:write')
  async testNotificationChannel(@Param('projectId') projectId: string, @Param('channelId') channelId: string) {
    return this.channels.testChannel(projectId, channelId);
  }
}
