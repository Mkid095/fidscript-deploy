import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { EventService } from '@/modules/events/event.service';
import { AIProvider } from '@/modules/ai/providers/ai-provider.interface';

@Injectable()
export class AIConversationService {
  constructor(
    private prisma: PrismaService,
    private events: EventService,
    @Inject('AI_PROVIDER') private aiProvider: AIProvider,
  ) {}

  async createConversation(projectId: string, userId: string | null, dto: any) {
    const model = dto.model || 'gemini-1.5-flash';
    const conversation = await this.prisma.aIConversation.create({
      data: {
        projectId,
        userId,
        type: dto.type || 'general',
        model,
        metadata: dto.metadata || {},
      },
    });
    this.events.emit('ai.conversation.created', { conversationId: conversation.id, projectId });
    return conversation;
  }

  async listConversations(projectId: string, limit = 50) {
    return this.prisma.aIConversation.findMany({
      where: { projectId },
      orderBy: { updatedAt: 'desc' },
      take: limit,
      select: {
        id: true,
        type: true,
        model: true,
        tokenCount: true,
        createdAt: true,
        updatedAt: true,
        messages: {
          take: 1,
          orderBy: { createdAt: 'desc' },
          select: { content: true },
        },
      },
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
    const conversation = await this.getConversation(projectId, conversationId);
    const model = dto.model || conversation.model;

    await this.prisma.aIMessage.create({
      data: {
        conversationId,
        role: 'user',
        content: dto.content,
        model,
      },
    });

    const messages = await this.prisma.aIMessage.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'asc' },
      select: { role: true, content: true },
    });

    const systemPrompt = this.buildSystemPrompt(projectId);
    const apiMessages = [
      { role: 'user', content: systemPrompt },
      ...messages.map((m) => ({
        role: m.role === 'user' ? 'user' : 'model',
        content: m.content,
      })),
    ];

    const response = await this.aiProvider.complete({
      model,
      messages: apiMessages,
      temperature: 0.7,
    });

    await this.prisma.aIMessage.create({
      data: {
        conversationId,
        role: 'assistant',
        content: response.content,
        model: response.model,
        tokenCount: response.tokenCount,
        latencyMs: response.latencyMs,
      },
    });

    await this.prisma.aIConversation.update({
      where: { id: conversationId },
      data: { tokenCount: { increment: response.tokenCount } },
    });

    return {
      content: response.content,
      model: response.model,
      tokenCount: response.tokenCount,
      latencyMs: response.latencyMs,
    };
  }

  async deleteConversation(projectId: string, conversationId: string) {
    const conversation = await this.prisma.aIConversation.findFirst({
      where: { id: conversationId, projectId },
    });
    if (!conversation) throw new NotFoundException('Conversation not found');

    await this.prisma.aIMessage.deleteMany({ where: { conversationId } });
    await this.prisma.aIConversation.delete({ where: { id: conversationId } });
    this.events.emit('ai.conversation.deleted', { conversationId, projectId });
    return { deleted: true };
  }

  async chat(projectId: string, userId: string | null, content: string) {
    let conversation = await this.prisma.aIConversation.findFirst({
      where: { projectId, userId, type: 'general' },
      orderBy: { updatedAt: 'desc' },
    });

    if (!conversation) {
      conversation = await this.createConversation(projectId, userId, { type: 'general' });
    }

    return this.sendMessage(projectId, conversation.id, { content });
  }

  parseAIJsonResponse(content: string): any {
    try {
      const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/) ||
                        content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0].replace(/```json\s*/, '').replace(/```\s*$/, '').trim());
      }
      return { raw: content };
    } catch {
      return { raw: content };
    }
  }

  private buildSystemPrompt(projectId: string): string {
    return `You are FIDScript Deploy's AI assistant, a cloud-native development platform.
You help developers with:
- Project setup and management
- Deployment troubleshooting
- Infrastructure recommendations
- Database and storage questions
- Function and queue configuration
- Monitoring and logging setup

Be concise, helpful, and focus on actionable advice.`;
  }
}
