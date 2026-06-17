import { Injectable, Inject } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { EventService } from '@/modules/events/event.service';
import { AIProvider } from '@/modules/ai/providers/ai-provider.interface';

@Injectable()
export class AIAssistantService {
  constructor(
    private prisma: PrismaService,
    private events: EventService,
    @Inject('AI_PROVIDER') private aiProvider: AIProvider,
  ) {}

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
