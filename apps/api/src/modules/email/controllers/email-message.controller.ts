/**
 * Project-scoped email controller — write paths (send, mark read, star, delete).
 *
 * Read-only endpoints (list / get / status) live in EmailMessageListController.
 *
 * Auth: accepts EITHER a JWT (dashboard) OR a project API key (X-API-Key: fpk_...)
 * for BaaS / external apps. API-key callers' key MUST match the URL :projectId.
 */
import {
  Controller, Post, Patch, Delete, Body, Param, Query, Req,
  UseGuards, HttpCode, HttpStatus, ForbiddenException, Headers,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Request } from 'express';
import { ApiKeyOrJwtGuard } from '@/modules/auth/guards/api-key-or-jwt.guard';
import { ScopeGuard } from '@/modules/auth/guards/scope-guard';
import { RequireScope } from '@/modules/auth/decorators/require-scope.decorator';
import { ProjectMemberGuard } from '@/modules/auth/guards/project-member.guard';
import { EmailMessageService } from '@/modules/email/services/message.service';
import { EmailIdempotencyService } from '@/modules/email/services/idempotency.service';
import { SendEmailDto } from '@/modules/email/dto/send-email.dto';
import { MarkMessagesReadDto } from '@/modules/email/dto/mark-messages-read.dto';
import { DeleteMessagesDto } from '@/modules/email/dto/delete-messages.dto';

@ApiTags('email-messages')
@Controller('projects/:projectId/email')
@UseGuards(ApiKeyOrJwtGuard, ScopeGuard, ProjectMemberGuard)
@ApiBearerAuth()
export class EmailMessageController {
  constructor(
    private messageService: EmailMessageService,
    private idempotency: EmailIdempotencyService,
  ) {}

  @Post('send')
  @HttpCode(HttpStatus.OK)
  @RequireScope('email:send')
  @ApiOperation({ summary: 'Send an email (via Stalwart SMTP submission). BaaS: API-key authenticated.' })
  async sendEmail(
    @Req() req: Request,
    @Param('projectId') projectId: string,
    @Body() dto: SendEmailDto,
    @Headers('idempotency-key') idempotencyKey?: string,
  ) {
    this.assertCanAccessProject(req, projectId);

    const payload = { to: dto.to, from: dto.from, subject: dto.subject, text: dto.text, html: dto.html };

    if (idempotencyKey) {
      const { action, token, cachedResponse } = await this.idempotency.checkOrWait(
        projectId, idempotencyKey, payload,
      );
      if (action === 'cached' && cachedResponse) return cachedResponse.body;
      try {
        const result = await this.messageService.sendEmail(projectId, dto);
        await this.idempotency.complete(projectId, idempotencyKey, token, 200, result);
        return result;
      } catch (err) {
        await this.idempotency.fail(
          projectId, idempotencyKey, token,
          (err as { status?: number }).status ?? 500,
          (err as Error).message,
        );
        throw err;
      }
    }

    return this.messageService.sendEmail(projectId, dto);
  }

  @Patch('messages/read')
  @HttpCode(HttpStatus.OK)
  @RequireScope('email:write')
  @ApiOperation({ summary: 'Mark messages as read/unread. BaaS: API-key authenticated.' })
  markMessagesRead(
    @Req() req: Request,
    @Param('projectId') projectId: string,
    @Body() dto: MarkMessagesReadDto,
  ) {
    this.assertCanAccessProject(req, projectId);
    return this.messageService.markMessagesRead(projectId, dto);
  }

  @Patch('messages/:messageId/star')
  @RequireScope('email:write')
  @ApiOperation({ summary: 'Star or unstar a message. BaaS: API-key authenticated.' })
  markMessageStarred(
    @Req() req: Request,
    @Param('projectId') projectId: string,
    @Param('messageId') messageId: string,
    @Query('starred') starred: string,
  ) {
    this.assertCanAccessProject(req, projectId);
    return this.messageService.markMessageStarred(projectId, messageId, starred === 'true');
  }

  @Delete('messages')
  @HttpCode(HttpStatus.OK)
  @RequireScope('email:write')
  @ApiOperation({ summary: 'Delete message metadata rows. BaaS: API-key authenticated.' })
  deleteMessages(
    @Req() req: Request,
    @Param('projectId') projectId: string,
    @Body() dto: DeleteMessagesDto,
  ) {
    this.assertCanAccessProject(req, projectId);
    return this.messageService.deleteMessages(projectId, dto);
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
