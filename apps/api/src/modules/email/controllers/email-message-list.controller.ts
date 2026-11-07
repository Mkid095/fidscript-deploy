/**
 * Email message read-only controller — list / get / status endpoints.
 *
 * Split out of EmailMessageController so the main controller can focus on
 * send / read-flag / star / delete (the write paths).
 */
import {
  Controller, Get, Query, Param, Req, UseGuards, ForbiddenException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Request } from 'express';
import { ApiKeyOrJwtGuard } from '@/modules/auth/guards/api-key-or-jwt.guard';
import { ScopeGuard } from '@/modules/auth/guards/scope-guard';
import { RequireScope } from '@/modules/auth/decorators/require-scope.decorator';
import { ProjectMemberGuard } from '@/modules/auth/guards/project-member.guard';
import { EmailMessageService } from '@/modules/email/services/message.service';
import { ListMessagesDto } from '@/modules/email/dto/list-messages.dto';

@ApiTags('email-messages')
@Controller('projects/:projectId/email')
@UseGuards(ApiKeyOrJwtGuard, ScopeGuard, ProjectMemberGuard)
@ApiBearerAuth()
export class EmailMessageListController {
  constructor(private messageService: EmailMessageService) {}

  @Get('messages')
  @RequireScope('email:read')
  @ApiOperation({ summary: 'List messages (supports folder and unread filters). BaaS: API-key authenticated.' })
  listMessages(
    @Req() req: Request,
    @Param('projectId') projectId: string,
    @Query() dto: ListMessagesDto,
  ) {
    this.assertCanAccessProject(req, projectId);
    return this.messageService.listMessages(projectId, dto);
  }

  @Get('messages/:messageId')
  @RequireScope('email:read')
  @ApiOperation({ summary: 'Get message metadata. BaaS: API-key authenticated.' })
  getMessage(
    @Req() req: Request,
    @Param('projectId') projectId: string,
    @Param('messageId') messageId: string,
  ) {
    this.assertCanAccessProject(req, projectId);
    return this.messageService.getMessage(projectId, messageId);
  }

  @Get('messages/:messageId/status')
  @RequireScope('email:read')
  @ApiOperation({ summary: 'Get message delivery status with attempt history' })
  getMessageStatus(
    @Req() req: Request,
    @Param('projectId') projectId: string,
    @Param('messageId') messageId: string,
  ) {
    this.assertCanAccessProject(req, projectId);
    return this.messageService.getMessageStatus(projectId, messageId);
  }

  private assertCanAccessProject(req: Request, projectId: string): void {
    const user = req.user as { isApiKey?: boolean; projectId?: string } | undefined;
    if (user?.isApiKey) {
      if (!user.projectId || user.projectId !== projectId) {
        throw new ForbiddenException('API key does not have access to this project');
      }
    }
  }
}
