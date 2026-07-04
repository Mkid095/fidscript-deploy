import { Injectable } from '@nestjs/common';
import { EventService } from '@/modules/events/event.service';

export interface AuditContext {
  actorId?: string;
  actorType?: 'user' | 'system' | 'api_key';
  projectId?: string;
  ipAddress?: string;
  userAgent?: string;
  resourceType?: string;
  resourceId?: string;
}

/**
 * EmailAuditService — centralizes all email audit event emission.
 *
 * Wraps EventService.emit() with consistent actor attribution.
 * The existing AuditEventConsumer (wildcard @OnEvent('**')) picks these up
 * automatically — no new consumers needed.
 *
 * Usage:
 *   await audit.emit('email.message.read', ctx, { messageId, ... });
 */
@Injectable()
export class EmailAuditService {
  constructor(private events: EventService) {}

  async emit(type: string, ctx: AuditContext, metadata: Record<string, unknown>): Promise<void> {
    await this.events.emit(
      type as any,
      ctx.projectId ?? null,
      metadata,
      {
        actorId: ctx.actorId,
        actorType: ctx.actorType,
        resourceType: ctx.resourceType,
        resourceId: ctx.resourceId,
        ipAddress: ctx.ipAddress,
        userAgent: ctx.userAgent,
      },
    );
  }

  // ─── Message lifecycle ───────────────────────────────────────────────────────

  async messageSent(ctx: AuditContext, data: { messageId: string; to: string; from: string; subject: string }) {
    await this.emit('email.message.sent', ctx, data);
  }

  async messageRead(ctx: AuditContext, data: { messageId: string }) {
    await this.emit('email.message.read', ctx, { ...data, resourceType: 'email_message' });
  }

  async messageDeleted(ctx: AuditContext, data: { messageId: string; permanent?: boolean }) {
    await this.emit(
      data.permanent ? 'email.message.permanently_deleted' : 'email.message.deleted',
      ctx,
      { ...data, resourceType: 'email_message' },
    );
  }

  async messageExported(ctx: AuditContext, data: { messageIds: string[]; format: string }) {
    await this.emit('email.message.exported', ctx, { ...data, resourceType: 'email_message' });
  }

  async messageMoved(ctx: AuditContext, data: { messageId: string; fromFolder: string; toFolder: string }) {
    await this.emit('email.message.moved', ctx, { ...data, resourceType: 'email_message' });
  }

  async messageRestored(ctx: AuditContext, data: { messageId: string }) {
    await this.emit('email.message.restored', ctx, { ...data, resourceType: 'email_message' });
  }

  async messageReplied(ctx: AuditContext, data: { messageId: string; replyId: string }) {
    await this.emit('email.message.replied', ctx, { ...data, resourceType: 'email_message' });
  }

  async messageForwarded(ctx: AuditContext, data: { messageId: string; forwardedTo: string }) {
    await this.emit('email.message.forwarded', ctx, { ...data, resourceType: 'email_message' });
  }

  // ─── Mailbox lifecycle ───────────────────────────────────────────────────────

  async mailboxCreated(ctx: AuditContext, data: { mailboxId: string; email: string }) {
    await this.emit('email.mailbox_created', ctx, { ...data, resourceType: 'email_mailbox' });
  }

  async mailboxDeleted(ctx: AuditContext, data: { mailboxId: string; email: string }) {
    await this.emit('email.mailbox_deleted', ctx, { ...data, resourceType: 'email_mailbox' });
  }

  async mailboxMemberAdded(ctx: AuditContext, data: { mailboxId: string; memberId: string; userId?: string; apiKeyId?: string }) {
    await this.emit('email.mailbox.member_added', ctx, { ...data, resourceType: 'email_mailbox_member' });
  }

  async mailboxMemberRemoved(ctx: AuditContext, data: { mailboxId: string; memberId: string }) {
    await this.emit('email.mailbox.member_removed', ctx, { ...data, resourceType: 'email_mailbox_member' });
  }

  // ─── Conversation ────────────────────────────────────────────────────────────

  async conversationAssigned(ctx: AuditContext, data: { conversationId: string; memberId: string; assignedBy: string }) {
    await this.emit('email.conversation.assigned', ctx, { ...data, resourceType: 'email_conversation' });
  }

  async conversationUnassigned(ctx: AuditContext, data: { conversationId: string; memberId: string }) {
    await this.emit('email.conversation.unassigned', ctx, { ...data, resourceType: 'email_conversation' });
  }

  async conversationClosed(ctx: AuditContext, data: { conversationId: string }) {
    await this.emit('email.conversation.closed', ctx, { ...data, resourceType: 'email_conversation' });
  }

  async conversationReopened(ctx: AuditContext, data: { conversationId: string }) {
    await this.emit('email.conversation.reopened', ctx, { ...data, resourceType: 'email_conversation' });
  }
}
