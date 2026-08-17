/**
 * Conversation DB operations — encapsulates all Prisma queries against
 * `emailConversation`, `emailConversationAssignment`. The threading rules
 * and orchestration live in ConversationService.
 */
import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { EventService } from '@/modules/events/event.service';

@Injectable()
export class ConversationStoreService {
  constructor(
    private prisma: PrismaService,
    private events: EventService,
  ) {}

  async findByThreadKey(threadKey: string) {
    return this.prisma.emailConversation.findUnique({ where: { threadKey } });
  }

  async createConversation(mailboxId: string, threadKey: string, subject: string | null) {
    return this.prisma.emailConversation.create({
      data: { mailboxId, threadKey, subject, status: 'OPEN' },
    });
  }

  async findWithProjectScope(conversationId: string) {
    return this.prisma.emailConversation.findFirst({
      where: { id: conversationId },
      include: { mailbox: { include: { domain: { select: { projectId: true } } } } },
    });
  }

  async createAssignment(conversationId: string, memberId: string, assignedBy: string) {
    return this.prisma.emailConversationAssignment.create({
      data: { conversationId, memberId, assignedBy },
    });
  }

  async markAssigned(conversationId: string) {
    return this.prisma.emailConversation.update({
      where: { id: conversationId },
      data: { status: 'ASSIGNED' },
    });
  }

  async unassignMembers(conversationId: string, memberId: string, unassignedBy: string) {
    return this.prisma.emailConversationAssignment.updateMany({
      where: { conversationId, memberId },
      data: { unassignedAt: new Date(), unassignedBy },
    });
  }

  async countActiveAssignments(conversationId: string): Promise<number> {
    return this.prisma.emailConversationAssignment.count({
      where: { conversationId, unassignedAt: null },
    });
  }

  async markOpen(conversationId: string) {
    return this.prisma.emailConversation.update({
      where: { id: conversationId },
      data: { status: 'OPEN' },
    });
  }

  async markClosed(conversationId: string) {
    return this.prisma.emailConversation.update({
      where: { id: conversationId },
      data: { status: 'CLOSED' },
    });
  }

  async listForMailbox(
    mailboxId: string,
    filters: { status?: string; assigneeId?: string; page?: number; limit?: number },
  ) {
    const where: Record<string, unknown> = { mailboxId };
    if (filters.status) where.status = filters.status;
    if (filters.assigneeId) {
      where.assignments = {
        some: { memberId: filters.assigneeId, unassignedAt: null },
      };
    }
    const limit = filters.limit ?? 20;
    const page = filters.page ?? 1;

    return this.prisma.emailConversation.findMany({
      where,
      include: {
        assignments: {
          where: { unassignedAt: null },
          include: {
            member: { include: { user: { select: { id: true, email: true, name: true } } } },
          },
        },
        _count: { select: { messages: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: (page - 1) * limit,
    });
  }

  async countForMailbox(mailboxId: string, filters: { status?: string; assigneeId?: string }) {
    const where: Record<string, unknown> = { mailboxId };
    if (filters.status) where.status = filters.status;
    if (filters.assigneeId) {
      where.assignments = {
        some: { memberId: filters.assigneeId, unassignedAt: null },
      };
    }
    return this.prisma.emailConversation.count({ where });
  }
}
