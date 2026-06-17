import {
  Controller, Get, Post, Delete,
  Body, Param, Query, UseGuards, Req,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '@/modules/auth/jwt-auth.guard';
import { AIConversationService } from '@/modules/ai/services/ai-conversation.service';
import { AIAssistantService } from '@/modules/ai/services/ai-assistant.service';
import {
  CreateConversationDto,
  SendMessageDto,
  DiagnoseErrorDto,
  GetRecommendationsDto,
  AssistDeploymentDto,
  GenerateProjectDto,
} from '@/modules/ai/dto/index';

@ApiTags('ai')
@Controller('projects/:projectId/ai')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class AIController {
  constructor(
    private conversation: AIConversationService,
    private assistant: AIAssistantService,
  ) {}

  @Post('conversations')
  @ApiOperation({ summary: 'Create conversation' })
  async createConversation(
    @Param('projectId') projectId: string,
    @Req() req: any,
    @Body() dto: CreateConversationDto,
  ) {
    return this.conversation.createConversation(projectId, req.user?.id, dto);
  }

  @Get('conversations')
  @ApiOperation({ summary: 'List conversations' })
  async listConversations(
    @Param('projectId') projectId: string,
    @Query('limit') limit?: number,
  ) {
    return this.conversation.listConversations(projectId, limit);
  }

  @Get('conversations/:conversationId')
  @ApiOperation({ summary: 'Get conversation' })
  async getConversation(
    @Param('projectId') projectId: string,
    @Param('conversationId') conversationId: string,
  ) {
    return this.conversation.getConversation(projectId, conversationId);
  }

  @Post('conversations/:conversationId/messages')
  @ApiOperation({ summary: 'Send message' })
  async sendMessage(
    @Param('projectId') projectId: string,
    @Param('conversationId') conversationId: string,
    @Body() dto: SendMessageDto,
  ) {
    return this.conversation.sendMessage(projectId, conversationId, dto);
  }

  @Delete('conversations/:conversationId')
  @ApiOperation({ summary: 'Delete conversation' })
  async deleteConversation(
    @Param('projectId') projectId: string,
    @Param('conversationId') conversationId: string,
  ) {
    return this.conversation.deleteConversation(projectId, conversationId);
  }

  @Post('chat')
  @ApiOperation({ summary: 'Quick chat' })
  async chat(
    @Param('projectId') projectId: string,
    @Req() req: any,
    @Body() dto: { content: string },
  ) {
    return this.conversation.chat(projectId, req.user?.id, dto.content);
  }

  @Post('diagnose')
  @ApiOperation({ summary: 'Diagnose error' })
  async diagnoseError(@Param('projectId') projectId: string, @Body() dto: DiagnoseErrorDto) {
    return this.assistant.diagnoseError(projectId, dto);
  }

  @Post('recommendations')
  @ApiOperation({ summary: 'Get infrastructure recommendations' })
  async getRecommendations(
    @Param('projectId') projectId: string,
    @Body() dto: GetRecommendationsDto,
  ) {
    return this.assistant.getInfrastructureRecommendations(projectId, dto);
  }

  @Post('deploy')
  @ApiOperation({ summary: 'Deployment assistance' })
  async assistDeployment(
    @Param('projectId') projectId: string,
    @Body() dto: AssistDeploymentDto,
  ) {
    return this.assistant.assistDeployment(projectId, dto);
  }

  @Post('generate')
  @ApiOperation({ summary: 'Project generation assistance' })
  async assistProjectGeneration(
    @Param('projectId') projectId: string,
    @Body() dto: GenerateProjectDto,
  ) {
    return this.assistant.assistProjectGeneration(projectId, dto);
  }
}
