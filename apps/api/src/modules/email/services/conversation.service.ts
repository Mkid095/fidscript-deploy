/**
 * Conversation service — threads email messages and manages assignments.
 *
 * Threading: uses threadKey = SHA256(messageId + inReplyTo + references) to
 * group messages into conversations. This is stable regardless of subject
 * line changes. The first message in a thread creates the conversation;
 * subsequent replies are linked via conversationId on EmailMessage.
 *
 * Split into:
 *   - ConversationStoreService — Prisma queries
 *   - ConversationService (this) — threading rules + assignment workflow
 */
import { Injectable, NotFoundException } from '@nestjs/common';
import { EventService } from '@/modules/events/event.service';
import { ConversationStoreService } from './conversation-store.service';
import * as crypto from 'crypto';

@Injectable()
export class ConversationService {
  constructor(
    private store: ConversationStoreService,
    private events: EventService,
  ) {}

  /**
   * Get or create a conversation for an inbound or outbound message.
   */
  async getOrCreateConversation(
    mailboxId: string,
    message: { id: string; inReplyTo?: string | null; references?: string | null; subject?: string | null },
  ): Promise<{ conversationId: string; isNew: boolean; subject: string | null }> {
    const threadKey = this.buildThreadKey(message.id, message.inReplyTo, message.references);

    const existing = await this.store.findByThreadKey(threadKey);
    if (existing) {
      return { conversationId: existing.id, isNew: false, subject: existing.subject };
    }

    const conversation = await this.store.createConversation(mailboxId, threadKey, message.subject ?? null);
    return { conversationId: conversation.id, isNew: true, subject: conversation.subject };
  }

  async assignConversation(conversationId: string, memberId: string, assignedBy: string) {
    const conv = await this.store.findWithProjectScope(conversationId);
    if (!conv) throw new NotFoundException('Conversation not found');

    const assignment = await this.store.createAssignment(conversationId, memberId, assignedBy);
    await this.store.markAssigned(conversationId);
    await this.events.emit('email.conversation.assigned', conv.mailbox.domain.projectId, {
      conversationId, memberId, assignedBy,
    }, {});
    return assignment;
  }

  async unassignConversation(conversationId: string, memberId: string, unassignedBy: string) {
    const conv = await this.store.findWithProjectScope(conversationId);
    if (!conv) throw new NotFoundException('Conversation not found');

    await this.store.unassignMembers(conversationId, memberId, unassignedBy);
    const remaining = await this.store.countActiveAssignments(conversationId);
    if (remaining === 0) {
      await this.store.markOpen(conversationId);
    }
    await this.events.emit('email.conversation.unassigned', conv.mailbox.domain.projectId, {
      conversationId, memberId, unassignedBy,
    }, {});
    return { unassigned: true };
  }

  async closeConversation(conversationId: string) {
    const conv = await this.store.findWithProjectScope(conversationId);
    if (!conv) throw new NotFoundException('Conversation not found');
    await this.store.markClosed(conversationId);
    await this.events.emit('email.conversation.closed', conv.mailbox.domain.projectId, { conversationId }, {});
    return { status: 'CLOSED' };
  }

  async reopenConversation(conversationId: string) {
    const conv = await this.store.findWithProjectScope(conversationId);
    if (!conv) throw new NotFoundException('Conversation not found');
    await this.store.markOpen(conversationId);
    await this.events.emit('email.conversation.reopened', conv.mailbox.domain.projectId, { conversationId }, {});
    return { status: 'OPEN' };
  }

  async listConversations(
    mailboxId: string,
    filters: { status?: string; assigneeId?: string; page?: number; limit?: number } = {},
  ) {
    const [conversations, total] = await Promise.all([
      this.store.listForMailbox(mailboxId, filters),
      this.store.countForMailbox(mailboxId, filters),
    ]);
    const limit = filters.limit ?? 20;
    const page = filters.page ?? 1;
    return {
      data: conversations.map((c) => ({
        id: c.id,
        subject: c.subject,
        status: c.status,
        createdAt: c.createdAt,
        messageCount: c._count.messages,
        assignments: c.assignments.map((a) => ({
          memberId: a.memberId,
          user: a.member.user,
          assignedAt: a.assignedAt,
        })),
      })),
      total,
      page,
      limit,
    };
  }

  /**
   * Build a stable thread key from message headers.
   * Deterministic: same inputs always produce same key.
   */
  private buildThreadKey(
    messageId: string,
    inReplyTo?: string | null,
    references?: string | null,
  ): string {
    const parts = [messageId, inReplyTo, references].filter(Boolean);
    return crypto.createHash('sha256').update(parts.join('|')).digest('hex').slice(0, 64);
  }
}
