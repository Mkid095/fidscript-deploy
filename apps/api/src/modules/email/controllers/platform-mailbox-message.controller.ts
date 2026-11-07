/**
 * Platform mailbox management API (admin-only).
 *
 * Exposes the platform's own mailboxes (alert@, noreply@, postmaster@, and
 * any custom mailbox on PLATFORM_DOMAIN) for viewing and basic operation.
 * Distinct from the project-scoped email controllers (EmailMessageController)
 * which manage rows in `email.messages`.
 *
 * Routes:
 *   GET    /admin/mailboxes                       — list platform mailboxes
 *   POST   /admin/mailboxes                       — create a new platform mailbox
 *   GET    /admin/mailboxes/:local/messages       — list messages in folder
 *   GET    /admin/mailboxes/:local/messages/:id   — get a single message
 *   PATCH  /admin/mailboxes/:local/messages/:id   — set read/starred/folder
 *   DELETE /admin/mailboxes/:local/messages/:id   — delete a message
 *
 * Auth: only platform admins (role=ADMIN) can read these — they include
 * magic-code notifications, bounce reports, and security alerts.
 */
import {
  Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards, HttpCode, HttpStatus, BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '@/modules/auth/jwt-auth.guard';
import { PlatformAdminGuard } from '@/modules/auth/guards/platform-admin.guard';
import { Roles } from '@/modules/auth/guards/roles.decorator';
import { Role } from '@prisma/client';
import { PlatformMailboxMessageService } from '@/modules/email/services/platform-mailbox-message.service';
import { IEmailProvider, EMAIL_PROVIDER } from '@/modules/email/providers/i-email-provider';
import { Inject, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

@ApiTags('admin-mailboxes')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PlatformAdminGuard)
@Roles(Role.ADMIN, Role.OWNER)
@Controller('admin/mailboxes')
export class PlatformMailboxController {
  constructor(
    private messages: PlatformMailboxMessageService,
    @Inject(EMAIL_PROVIDER) private email: IEmailProvider,
    private config: ConfigService,
  ) {}

  @Get()
  async listMailboxes() {
    const domain = this.config.get<string>('PLATFORM_DOMAIN', 'deploy.fidscript.com');
    const d = await this.email.ensureDomain({ name: domain, isEnabled: true });
    const all = await this.email.listMailboxes(d.id);
    return {
      domain,
      domainId: d.id,
      mailboxes: all,
    };
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createMailbox(@Body() body: { localPart: string; displayName?: string; quotaMb?: number; password?: string }) {
    if (!body.localPart) throw new BadRequestException('localPart required');
    const domain = this.config.get<string>('PLATFORM_DOMAIN', 'deploy.fidscript.com');
    const d = await this.email.ensureDomain({ name: domain, isEnabled: true });
    const password = body.password ?? crypto.randomBytes(12).toString('base64url');
    const m = await this.email.createMailbox({
      name: body.localPart,
      domainId: d.id,
      description: body.displayName,
      password,
      quotaBytes: (body.quotaMb ?? 1024) * 1024 * 1024,
    });
    return { mailbox: m, password, message: 'Save the password — it is not stored in plain text and cannot be recovered.' };
  }

  @Get(':local/messages')
  async listMessages(
    @Param('local') local: string,
    @Query('folder') folder: 'inbox' | 'sent' | 'drafts' | 'trash' | 'junk' | 'archive' = 'inbox',
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
    @Query('unread') unread?: string,
  ) {
    return this.messages.list(local, folder, {
      limit: limit ? Number(limit) : undefined,
      offset: offset ? Number(offset) : undefined,
      unreadOnly: unread === 'true',
    });
  }

  // NOTE: attachment routes MUST come before :local/messages/:id
  // because NestJS matches greedily — otherwise :id captures "attachments".

  /** GET :local/messages/:id/attachments — list attachment metadata for a message. */
  @Get(':local/messages/:id/attachments')
  async listAttachments(@Param('local') local: string, @Param('id') id: string) {
    return this.messages.listAttachments(local, id);
  }

  /** GET :local/messages/:id/attachments/:blobId — download a specific attachment blob. */
  @Get(':local/messages/:id/attachments/:blobId')
  async downloadAttachment(
    @Param('local') local: string,
    @Param('id') id: string,
    @Param('blobId') blobId: string,
  ) {
    const blob = await this.messages.downloadAttachment(local, id, blobId);
    // Return as a raw download — the client will handle base64 decode
    return {
      blobId,
      type: blob.type,
      name: blob.name,
      size: blob.size,
      data: blob.bytes.toString('base64'),
    };
  }

  @Get(':local/messages/:id')
  async getMessage(@Param('local') local: string, @Param('id') id: string) {
    return this.messages.get(local, id);
  }

  @Patch(':local/messages/:id')
  @HttpCode(HttpStatus.OK)
  async patchMessage(
    @Param('local') local: string,
    @Param('id') id: string,
    @Body() body: { isRead?: boolean; isStarred?: boolean; moveTo?: 'inbox' | 'trash' | 'junk' | 'archive' },
  ) {
    if (body.isRead !== undefined) await this.messages.setRead(local, id, body.isRead);
    if (body.isStarred !== undefined) await this.messages.setStarred(local, id, body.isStarred);
    if (body.moveTo) await this.messages.moveTo(local, id, body.moveTo);
    return { ok: true };
  }

  @Delete(':local/messages/:id')
  @HttpCode(HttpStatus.OK)
  async deleteMessage(@Param('local') local: string, @Param('id') id: string) {
    await this.messages.delete(local, id);
    return { ok: true };
  }
}
