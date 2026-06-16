import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service.js';
import { EventsService } from '../events/events.service.js';
import { AIProvider } from './providers/ai-provider.interface.js';
import { GeminiProvider } from './providers/gemini.provider.js';

@Injectable()
export class AIService {
  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
    private events: EventsService,
    @Inject('AI_PROVIDER') private aiProvider: AIProvider,
  ) {}

  async createConversation(projectId: string, userId: string | null, dto: any) {
    const model = dto.model || 'gemini-1.5-flash';
    const conversation = await this.prisma.aiConversation.create({
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
    return this.prisma.aiConversation.findMany({
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
    const conversation = await this.prisma.aiConversation.findFirst({
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

    await this.prisma.aiConversation.update({
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

  async diagnoseError(projectId: string, dto: any) {
    const systemPrompt = `You are FIDScript Deploy's AI error diagnosis assistant.
Analyze errors and provide:
1. Root cause analysis
2. Suggested fix
3. Prevention tips
4. Related documentation links

Format response as JSON with: diagnosis, fix, prevention, links`;

    const response = await this.aiProvider.complete({
      model: 'gemini-1.5-flash',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Error: ${dto.error}\nContext: ${JSON.stringify(dto.context || {})}` },
      ],
    });

    this.events.emit('ai.error_diagnosed', { projectId, error: dto.error });
    return this.parseAIJsonResponse(response.content);
  }

  async getInfrastructureRecommendations(projectId: string, dto: any) {
    const project = await this.prisma.project.findUnique({ where: { id: projectId } });
    const systemPrompt = `You are FIDScript Deploy's infrastructure advisor.
Based on project type and current setup, recommend:
1. Optimal deployment strategy
2. Resource sizing
3. Scaling recommendations
4. Cost optimization tips

Format response as JSON with: recommendations (array), estimatedCost, scalingStrategy`;

    const response = await this.aiProvider.complete({
      model: 'gemini-1.5-flash',
      messages: [
        { role: 'system', content: systemPrompt },
        {
          role: 'user',
          content: `Project: ${project?.name}\nType: ${project?.type}\nSetup: ${JSON.stringify(dto.currentSetup || {})}`,
        },
      ],
    });

    this.events.emit('ai.recommendation.generated', { projectId });
    return this.parseAIJsonResponse(response.content);
  }

  async assistDeployment(projectId: string, dto: any) {
    const deployment = dto.deploymentId
      ? await this.prisma.deployment.findFirst({
          where: { id: dto.deploymentId, projectId },
        })
      : null;

    const systemPrompt = `You are FIDScript Deploy's deployment assistant.
Help with:
1. Deployment status explanation
2. Troubleshooting failed deployments
3. Build optimization tips
4. Rollback guidance

Format response as JSON with: status, issues (array), suggestions (array)`;

    const response = await this.aiProvider.complete({
      model: 'gemini-1.5-flash',
      messages: [
        { role: 'system', content: systemPrompt },
        {
          role: 'user',
          content: `Action: ${dto.action}\nDeployment: ${JSON.stringify(deployment || {})}`,
        },
      ],
    });

    this.events.emit('ai.deployment.assisted', { projectId, deploymentId: dto.deploymentId });
    return this.parseAIJsonResponse(response.content);
  }

  async assistProjectGeneration(projectId: string, dto: any) {
    const templates = await this.prisma.template.findMany({
      where: { projectId, isPublic: true },
      take: 5,
    });

    const systemPrompt = `You are FIDScript Deploy's project generation assistant.
Based on description and requirements, suggest:
1. Project structure
2. Recommended template
3. Key features to include
4. Estimated setup time

Format response as JSON with: structure, template, features (array), setupSteps (array)`;

    const response = await this.aiProvider.complete({
      model: 'gemini-1.5-flash',
      messages: [
        { role: 'system', content: systemPrompt },
        {
          role: 'user',
          content: `Description: ${dto.description}\nRequirements: ${JSON.stringify(dto.requirements || [])}\nAvailable templates: ${JSON.stringify(templates.map((t) => ({ name: t.name, category: t.category })))}`,
        },
      ],
    });

    this.events.emit('ai.project.generation_assisted', { projectId });
    return this.parseAIJsonResponse(response.content);
  }

  async chat(projectId: string, userId: string | null, content: string) {
    let conversation = await this.prisma.aiConversation.findFirst({
      where: { projectId, userId, type: 'general' },
      orderBy: { updatedAt: 'desc' },
    });

    if (!conversation) {
      conversation = await this.createConversation(projectId, userId, { type: 'general' });
    }

    return this.sendMessage(projectId, conversation.id, { content });
  }

  async deleteConversation(projectId: string, conversationId: string) {
    const conversation = await this.prisma.aiConversation.findFirst({
      where: { id: conversationId, projectId },
    });
    if (!conversation) throw new NotFoundException('Conversation not found');

    await this.prisma.aiMessage.deleteMany({ where: { conversationId } });
    await this.prisma.aiConversation.delete({ where: { id: conversationId } });
    this.events.emit('ai.conversation.deleted', { conversationId, projectId });
    return { deleted: true };
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

  private parseAIJsonResponse(content: string): any {
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
}