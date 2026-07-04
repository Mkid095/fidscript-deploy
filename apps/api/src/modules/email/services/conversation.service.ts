import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { EventService } from '@/modules/events/event.service';
import * as crypto from 'crypto';

/**
 * Conversation service — threads email messages and manages assignments.
 *
 * Threading: uses threadKey = SHA256(messageId + inReplyTo + references) to group
 * messages into conversations. This is stable regardless of subject line changes.
 *
 * The first message in a thread creates the conversation; subsequent replies
 * are linked via conversationId on EmailMessage.
 */
@Injectable()
export class ConversationService {
  constructor(
    private prisma: PrismaService,
    private events: EventService,
  ) {}

  /**
   * Get or create a conversation for an inbound or outbound message.
   * Returns the conversation and whether it was newly created.
   */
  async getOrCreateConversation(
    mailboxId: string,
    message: { id: string; inReplyTo?: string | null; references?: string | null; subject?: string | null },
  ): Promise<{ conversationId: string; isNew: boolean; subject: string | null }> {
    const threadKey = this.buildThreadKey(message.id, message.inReplyTo, message.references);

    // Try to find existing conversation by threadKey
    const existing = await this.prisma.emailConversation.findUnique({ where: { threadKey } });
    if (existing) {
      return { conversationId: existing.id, isNew: false, subject: existing.subject };
    }

    // Create new conversation
    const conversation = await this.prisma.emailConversation.create({
      data: {
        mailboxId,
        threadKey,
        subject: message.subject ?? null,
        status: 'OPEN',
      },
    });

    return { conversationId: conversation.id, isNew: true, subject: conversation.subject };
  }

  /**
   * Assign a conversation to a mailbox member.
   */
  async assignConversation(
    conversationId: string,
    memberId: string,
    assignedBy: string,
  ) {
    const conv = await this.prisma.emailConversation.findFirst({
      where: { id: conversationId },
      include: { mailbox: { include: { domain: { select: { projectId: true } } } } },
    });
    if (!conv) throw new NotFoundException('Conversation not found');

    const assignment = await this.prisma.emailConversationAssignment.create({
      data: {
        conversationId,
        memberId,
        assignedBy,
      },
    });

    await this.prisma.emailConversation.update({
      where: { id: conversationId },
      data: { status: 'ASSIGNED' },
    });

    await this.events.emit('email.conversation.assigned', conv.mailbox.domain.projectId, {
      conversationId,
      memberId,
      assignedBy,
    }, {});

    return assignment;
  }

  /**
   * Unassign a member from a conversation.
   */
  async unassignConversation(
    conversationId: string,
    memberId: string,
    unassignedBy: string,
  ) {
    const conv = await this.prisma.emailConversation.findFirst({
      where: { id: conversationId },
      include: { mailbox: { include: { domain: { select: { projectId: true } } } } },
    });
    if (!conv) throw new NotFoundException('Conversation not found');

    await this.prisma.emailConversationAssignment.updateMany({
      where: { conversationId, memberId },
      data: { unassignedAt: new Date(), unassignedBy },
    });

    // Check if any remaining assignments
    const remaining = await this.prisma.emailConversationAssignment.count({
      where: { conversationId, unassignedAt: null },
    });
    if (remaining === 0) {
      await this.prisma.emailConversation.update({
        where: { id: conversationId },
        data: { status: 'OPEN' },
      });
    }

    await this.events.emit('email.conversation.unassigned', conv.mailbox.domain.projectId, {
      conversationId,
      memberId,
      unassignedBy,
    }, {});

    return { unassigned: true };
  }

  /**
   * Close a conversation.
   */
  async closeConversation(conversationId: string) {
    const conv = await this.prisma.emailConversation.findFirst({
      where: { id: conversationId },
      include: { mailbox: { include: { domain: { select: { projectId: true } } } } },
    });
    if (!conv) throw new NotFoundException('Conversation not found');

    await this.prisma.emailConversation.update({
      where: { id: conversationId },
      data: { status: 'CLOSED' },
    });

    await this.events.emit('email.conversation.closed', conv.mailbox.domain.projectId, {
      conversationId,
    }, {});

    return { status: 'CLOSED' };
  }

  /**
   * Reopen a closed conversation.
   */
  async reopenConversation(conversationId: string) {
    const conv = await this.prisma.emailConversation.findFirst({
      where: { id: conversationId },
      include: { mailbox: { include: { domain: { select: { projectId: true } } } } },
    });
    if (!conv) throw new NotFoundException('Conversation not found');

    await this.prisma.emailConversation.update({
      where: { id: conversationId },
      data: { status: 'OPEN' },
    });

    await this.events.emit('email.conversation.reopened', conv.mailbox.domain.projectId, {
      conversationId,
    }, {});

    return { status: 'OPEN' };
  }

  /**
   * List conversations for a mailbox with optional filters.
   */
  async listConversations(
    mailboxId: string,
    filters: { status?: string; assigneeId?: string; page?: number; limit?: number } = {},
  ) {
    const where: Record<string, unknown> = { mailboxId };
    if (filters.status) where.status = filters.status;
    if (filters.assigneeId) {
      where.assignments = {
        some: {
          memberId: filters.assigneeId,
          unassignedAt: null,
        },
      };
    }

    const [conversations, total] = await Promise.all([
      this.prisma.emailConversation.findMany({
        where,
        include: {
          assignments: {
            where: { unassignedAt: null },
            include: {
              member: {
                include: {
                  user: { select: { id: true, email: true, name: true } },
                },
              },
            },
          },
          _count: { select: { messages: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: filters.limit ?? 20,
        skip: ((filters.page ?? 1) - 1) * (filters.limit ?? 20),
      }),
      this.prisma.emailConversation.count({ where }),
    ]);

    return {
      data: conversations.map(c => ({
        id: c.id,
        subject: c.subject,
        status: c.status,
        createdAt: c.createdAt,
        messageCount: c._count.messages,
        assignments: c.assignments.map(a => ({
          memberId: a.memberId,
          user: a.member.user,
          assignedAt: a.assignedAt,
        })),
      })),
      total,
      page: filters.page ?? 1,
      limit: filters.limit ?? 20,
    };
  }

  /**
   * Build a stable thread key from message headers.
   * Deterministic: same inputs always produce same key.
   */
  private buildThreadKey(messageId: string, inReplyTo?: string | null, references?: string | null): string {
    const parts = [messageId, inReplyTo, references].filter(Boolean);
    return crypto.createHash('sha256').update(parts.join('|')).digest('hex').slice(0, 64);
  }
}
