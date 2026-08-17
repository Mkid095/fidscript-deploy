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
import { ApiKeyOrJwtGuard } from '../auth/guards/api-key-or-jwt.guard';
import { ProjectMemberGuard } from '../auth/guards/project-member.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { RealtimeService } from './realtime.service';
import {
  CreateChannelDto,
  SetPresenceDto,
  GetChannelMessagesDto,
  GenerateChannelTokenDto,
} from './dto/index';

@ApiTags('realtime')
@Controller('projects/:projectId/realtime')
@UseGuards(ApiKeyOrJwtGuard, ProjectMemberGuard)
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
  async listChannels(@Param('projectId') projectId: string, @CurrentUser() user: any) {
    const channels = await this.realtimeService.listChannels(projectId, user.userId);
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
  async setPresence(@Param('projectId') projectId: string, @Body() dto: SetPresenceDto, @CurrentUser() user: any) {
    return this.realtimeService.setUserPresence(projectId, user.userId, dto);
  }

  @Get('channels/:channelId/presence')
  @ApiOperation({ summary: 'Get channel presence' })
  async getChannelPresence(@Param('projectId') projectId: string, @Param('channelId') channelId: string, @CurrentUser() user: any) {
    const presence = await this.realtimeService.getChannelPresence(projectId, channelId, user.userId);
    return { presence };
  }

  @Post('channels/:channelId/token')
  @ApiOperation({ summary: 'Generate channel access token' })
  async generateChannelToken(
    @Param('projectId') projectId: string,
    @Param('channelId') channelId: string,
    @Body() _dto: GenerateChannelTokenDto,
    @CurrentUser() user: any,
  ) {
    const token = await this.realtimeService.generateChannelToken(
      projectId,
      channelId,
      user.userId,
    );
    return { token };
  }
}