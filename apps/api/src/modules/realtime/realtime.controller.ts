import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RealtimeService } from './realtime.service';
import { CreateChannelDto, SetPresenceDto, GetChannelMessagesDto } from './dto/index';

@ApiTags('realtime')
@Controller('projects/:projectId/realtime')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class RealtimeController {
  constructor(private realtimeService: RealtimeService) {}

  @Post('channels')
  @ApiOperation({ summary: 'Create channel' })
  async createChannel(@Param('projectId') projectId: string, @Body() dto: CreateChannelDto) {
    return this.realtimeService.createChannel(projectId, dto);
  }

  @Get('channels')
  @ApiOperation({ summary: 'List channels' })
  async listChannels(@Param('projectId') projectId: string) {
    const channels = await this.realtimeService.listChannels(projectId);
    return { channels };
  }

  @Get('channels/:channelId')
  @ApiOperation({ summary: 'Get channel' })
  async getChannel(@Param('projectId') projectId: string, @Param('channelId') channelId: string) {
    return this.realtimeService.getChannel(projectId, channelId);
  }

  @Delete('channels/:channelId')
  @ApiOperation({ summary: 'Delete channel' })
  async deleteChannel(@Param('projectId') projectId: string, @Param('channelId') channelId: string) {
    return this.realtimeService.deleteChannel(projectId, channelId);
  }

  @Get('channels/:channelId/messages')
  @ApiOperation({ summary: 'Get channel messages' })
  async getChannelMessages(
    @Param('projectId') projectId: string,
    @Param('channelId') channelId: string,
    @Query() query: { limit?: number; cursor?: string },
  ) {
    return this.realtimeService.getChannelMessages(projectId, channelId, query.limit, query.cursor);
  }

  @Post('presence')
  @ApiOperation({ summary: 'Set user presence' })
  async setPresence(@Param('projectId') projectId: string, @Body() dto: SetPresenceDto) {
    return this.realtimeService.setUserPresence(projectId, dto.channelId, dto);
  }

  @Get('channels/:channelId/presence')
  @ApiOperation({ summary: 'Get channel presence' })
  async getChannelPresence(@Param('projectId') projectId: string, @Param('channelId') channelId: string) {
    const presence = await this.realtimeService.getChannelPresence(projectId, channelId);
    return { presence };
  }

  @Post('channels/:channelId/token')
  @ApiOperation({ summary: 'Generate channel access token' })
  async generateChannelToken(
    @Param('projectId') projectId: string,
    @Param('channelId') channelId: string,
    @Body() body: { userId: string },
  ) {
    const token = await this.realtimeService.generateChannelToken(channelId, body.userId);
    return { token };
  }
}