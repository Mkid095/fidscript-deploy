import { Controller, Get, Post, Patch, Delete, Param, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '@/modules/auth/jwt-auth.guard';
import { NotificationChannelService } from '@/modules/monitoring/services/notification-channel.service';
import { CreateNotificationChannelDto, UpdateNotificationChannelDto } from '@/modules/monitoring/dto/index';

@ApiTags('monitoring/channels')
@Controller('projects/:projectId/monitoring/channels')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class NotificationChannelsController {
  constructor(private channels: NotificationChannelService) {}

  @Post()
  async createNotificationChannel(@Param('projectId') projectId: string, @Body() dto: CreateNotificationChannelDto) {
    return this.channels.createNotificationChannel(projectId, dto);
  }

  @Get()
  async listNotificationChannels(@Param('projectId') projectId: string) {
    const channels = await this.channels.listNotificationChannels(projectId);
    return { channels };
  }

  @Get(':channelId')
  async getNotificationChannel(@Param('projectId') projectId: string, @Param('channelId') channelId: string) {
    return this.channels.getNotificationChannel(projectId, channelId);
  }

  @Patch(':channelId')
  async updateNotificationChannel(
    @Param('projectId') projectId: string,
    @Param('channelId') channelId: string,
    @Body() dto: UpdateNotificationChannelDto,
  ) {
    return this.channels.updateNotificationChannel(projectId, channelId, dto);
  }

  @Delete(':channelId')
  async deleteNotificationChannel(@Param('projectId') projectId: string, @Param('channelId') channelId: string) {
    return this.channels.deleteNotificationChannel(projectId, channelId);
  }
}
