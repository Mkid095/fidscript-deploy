import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { AIProvider } from '@/modules/ai/providers/ai-provider.interface';

@Injectable()
export class AIChatHandlerService {
  constructor(
    private prisma: PrismaService,
    @Inject('AI_PROVIDER') private aiProvider: AIProvider,
  ) {}

  async sendMessage(projectId: string, conversationId: string, dto: any) {
    const conversation = await this.prisma.aIConversation.findFirst({
      where: { id: conversationId, projectId },
      include: { messages: { orderBy: { createdAt: 'asc' } } },
    });
    if (!conversation) throw new NotFoundException('Conversation not found');

    const model = dto.model || conversation.model;

    await this.prisma.aIMessage.create({
      data: { conversationId, role: 'user', content: dto.content, model },
    });

    const messages = await this.prisma.aIMessage.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'asc' },
      select: { role: true, content: true },
    });

    const systemPrompt = this.buildSystemPrompt(projectId);
    const apiMessages = [
      { role: 'user', content: systemPrompt },
      ...messages.map((m) => ({ role: m.role === 'user' ? 'user' : 'model', content: m.content })),
    ];

    const response = await this.aiProvider.complete({ model, messages: apiMessages, temperature: 0.7 });

    await this.prisma.aIMessage.create({
      data: {
        conversationId, role: 'assistant', content: response.content,
        model: response.model, tokenCount: response.tokenCount, latencyMs: response.latencyMs,
      },
    });

    await this.prisma.aIConversation.update({
      where: { id: conversationId },
      data: { tokenCount: { increment: response.tokenCount } },
    });

    return { content: response.content, model: response.model, tokenCount: response.tokenCount, latencyMs: response.latencyMs };
  }

  async chat(projectId: string, userId: string | null, content: string) {
    let conversation = await this.prisma.aIConversation.findFirst({
      where: { projectId, userId, type: 'general' },
      orderBy: { updatedAt: 'desc' },
    });

    if (!conversation) {
      conversation = await this.prisma.aIConversation.create({
        data: { projectId, userId, type: 'general', model: 'gemini-1.5-flash', metadata: {} },
      });
    }

    return this.sendMessage(projectId, conversation.id, { content });
  }

  parseAIJsonResponse(content: string): any {
    try {
      const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/) || content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0].replace(/```json\s*/, '').replace(/```\s*$/, '').trim());
      }
      return { raw: content };
    } catch { return { raw: content }; }
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
