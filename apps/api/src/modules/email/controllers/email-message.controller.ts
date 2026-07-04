import {
  Controller, Get, Post, Patch, Delete, Body, Param, Query, Req,
  UseGuards, HttpCode, HttpStatus, ForbiddenException, Headers,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Request } from 'express';
import { ApiKeyOrJwtGuard } from '@/modules/auth/guards/api-key-or-jwt.guard';
import { EmailMessageService } from '@/modules/email/services/message.service';
import { EmailIdempotencyService } from '@/modules/email/services/idempotency.service';
import { SendEmailDto } from '@/modules/email/dto/send-email.dto';
import { ListMessagesDto } from '@/modules/email/dto/list-messages.dto';
import { MarkMessagesReadDto } from '@/modules/email/dto/mark-messages-read.dto';
import { DeleteMessagesDto } from '@/modules/email/dto/delete-messages.dto';

/**
 * Project-scoped email controller. Accepts EITHER a JWT (dashboard) OR a
 * project API key (X-API-Key: fpk_...) for BaaS / external apps.
 *
 * For API-key callers the key's project MUST match the URL `:projectId`
 * (enforced by `assertCanAccessProject`) — a key for project A cannot
 * reach project B's email. For JWT callers the existing dashboard auth
 * applies; deeper project-membership checks are out of scope for this pass.
 */
@ApiTags('email-messages')
@Controller('projects/:projectId/email')
@UseGuards(ApiKeyOrJwtGuard)
@ApiBearerAuth()
export class EmailMessageController {
  constructor(
    private messageService: EmailMessageService,
    private idempotency: EmailIdempotencyService,
  ) {}

  @Post('send')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Send an email (via Stalwart SMTP submission). BaaS: API-key authenticated.' })
  async sendEmail(
    @Req() req: Request,
    @Param('projectId') projectId: string,
    @Body() dto: SendEmailDto,
    @Headers('idempotency-key') idempotencyKey?: string,
  ) {
    this.assertCanAccessProject(req, projectId);

    // Idempotency: extract non-idempotent fields for payload hash
    const payload = { to: dto.to, from: dto.from, subject: dto.subject, text: dto.text, html: dto.html };

    if (idempotencyKey) {
      const { action, token, cachedResponse } = await this.idempotency.checkOrWait(
        projectId,
        idempotencyKey,
        payload,
      );
      if (action === 'cached' && cachedResponse) {
        return cachedResponse.body;
      }
      try {
        const result = await this.messageService.sendEmail(projectId, dto);
        await this.idempotency.complete(projectId, idempotencyKey, token, 200, result);
        return result;
      } catch (err) {
        await this.idempotency.fail(
          projectId,
          idempotencyKey,
          token,
          (err as { status?: number }).status ?? 500,
          (err as Error).message,
        );
        throw err;
      }
    }

    return this.messageService.sendEmail(projectId, dto);
  }

  @Get('messages')
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
  @ApiOperation({ summary: 'Get message delivery status with attempt history' })
  getMessageStatus(
    @Req() req: Request,
    @Param('projectId') projectId: string,
    @Param('messageId') messageId: string,
  ) {
    this.assertCanAccessProject(req, projectId);
    return this.messageService.getMessageStatus(projectId, messageId);
  }

  @Patch('messages/read')
  @HttpCode(HttpStatus.OK)
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
  @ApiOperation({ summary: 'Delete message metadata rows. BaaS: API-key authenticated.' })
  deleteMessages(
    @Req() req: Request,
    @Param('projectId') projectId: string,
    @Body() dto: DeleteMessagesDto,
  ) {
    this.assertCanAccessProject(req, projectId);
    return this.messageService.deleteMessages(projectId, dto);
  }

  /**
   * For API-key callers the URL `:projectId` MUST match the key's project.
   * For JWT callers, no extra check here (the dashboard's project shell
   * + JwtAuthGuard are the trust boundary; deeper membership checks are
   * a separate concern).
   */
  private assertCanAccessProject(req: Request, projectId: string): void {
    const user = req.user as { isApiKey?: boolean; projectId?: string } | undefined;
    if (user?.isApiKey) {
      if (!user.projectId || user.projectId !== projectId) {
        throw new ForbiddenException('API key does not have access to this project');
      }
    }
  }
}
