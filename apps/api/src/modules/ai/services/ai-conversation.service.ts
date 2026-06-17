import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { EventService } from '@/modules/events/event.service';
import { AIChatHandlerService } from './ai-chat-handler.service';

@Injectable()
export class AIConversationService {
  constructor(
    private prisma: PrismaService,
    private events: EventService,
    private chatHandler: AIChatHandlerService,
  ) {}

  async createConversation(projectId: string, userId: string | null, dto: any) {
    const model = dto.model || 'gemini-1.5-flash';
    const conversation = await this.prisma.aIConversation.create({
      data: { projectId, userId, type: dto.type || 'general', model, metadata: dto.metadata || {} },
    });
    this.events.emit('ai.conversation.created', { conversationId: conversation.id, projectId });
    return conversation;
  }

  async listConversations(projectId: string, limit = 50) {
    return this.prisma.aIConversation.findMany({
      where: { projectId },
      orderBy: { updatedAt: 'desc' },
      take: limit,
      select: { id: true, type: true, model: true, tokenCount: true, createdAt: true, updatedAt: true,
        messages: { take: 1, orderBy: { createdAt: 'desc' }, select: { content: true } } },
    });
  }

  async getConversation(projectId: string, conversationId: string) {
    const conversation = await this.prisma.aIConversation.findFirst({
      where: { id: conversationId, projectId },
      include: { messages: { orderBy: { createdAt: 'asc' } } },
    });
    if (!conversation) throw new NotFoundException('Conversation not found');
    return conversation;
  }

  async sendMessage(projectId: string, conversationId: string, dto: any) {
    return this.chatHandler.sendMessage(projectId, conversationId, dto);
  }

  async deleteConversation(projectId: string, conversationId: string) {
    const conversation = await this.prisma.aIConversation.findFirst({ where: { id: conversationId, projectId } });
    if (!conversation) throw new NotFoundException('Conversation not found');
    await this.prisma.aIMessage.deleteMany({ where: { conversationId } });
    await this.prisma.aIConversation.delete({ where: { id: conversationId } });
    this.events.emit('ai.conversation.deleted', { conversationId, projectId });
    return { deleted: true };
  }

  async chat(projectId: string, userId: string | null, content: string) {
    return this.chatHandler.chat(projectId, userId, content);
  }
}
