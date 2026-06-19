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

  /**
   * Diagnose an error using REAL platform context — deployment logs, recent alerts,
   * and deployment history are fetched from the platform and included in the prompt.
   * This makes the diagnosis grounded, not a generic hallucination.
   */
  async diagnoseError(projectId: string, dto: any) {
    // Fetch real platform context in parallel
    // LogEntry is scoped by streamId → LogStream.projectId, not directly by projectId
    const [deployment, firingAlerts] = await Promise.all([
      dto.deploymentId
        ? this.prisma.deployment.findFirst({ where: { id: dto.deploymentId, projectId } })
        : Promise.resolve(null),
      this.prisma.alert.findMany({
        where: { projectId, status: { in: ['FIRING', 'WARNING'] } },
        include: { rule: { select: { name: true } } },
        take: 10,
      }),
    ]);

    // Fetch log entries via the LogStream relation
    const recentLogs = await this.prisma.logEntry.findMany({
      where: {
        stream: { projectId },
        level: { in: ['error', 'fatal'] },
      },
      orderBy: { timestamp: 'desc' },
      take: 20,
    });

    // Redact secrets from logs before sending to AI
    const sanitizedLogs = recentLogs.map(l => ({
      timestamp: l.timestamp,
      level: l.level,
      message: this.redactSecrets(l.message),
    }));

    const context = {
      deployment: deployment
        ? { id: deployment.id, status: deployment.status, deploymentUrl: deployment.deploymentUrl, createdAt: deployment.createdAt }
        : null,
      recentErrors: sanitizedLogs,
      firingAlerts: firingAlerts.map(a => ({ ruleName: a.rule?.name, severity: a.severity, status: a.status, message: a.message })),
    };

    const systemPrompt = `You are FIDScript Deploy's AI error diagnosis assistant.
You have access to REAL platform data. Be specific and cite exact error messages, log lines, and metrics.
If the logs don't contain enough information to diagnose the issue, say so honestly.

Format response as JSON with: diagnosis (string), fix (string), prevention (string), links (string[])`;

    const response = await this.aiProvider.complete({
      model: 'gemini-1.5-flash',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Deployment ID: ${dto.deploymentId ?? 'not specified'}\nPlatform Context:\n${JSON.stringify(context, null, 2)}` },
      ],
    });

    this.events.emit('ai.error_diagnosed', { projectId, error: dto.error, deploymentId: dto.deploymentId });
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

  /**
   * Redact secrets from log messages before sending to AI to prevent leakage.
   * Redacts: API keys, DATABASE_URL, passwords, tokens.
   */
  private redactSecrets(text: string): string {
    return text
      .replace(/(fpk_[a-zA-Z0-9]{32,})/g, '[REDACTED_API_KEY]')
      .replace(/postgres(?:ql)?:\/\/[^:]+:[^@]+@[^/]+/g, '[REDACTED_DATABASE_URL]')
      .replace(/(Bearer |Token )([a-zA-Z0-9_\-\.]{10,})/g, '$1[REDACTED_TOKEN]')
      .replace(/password["\s:=]+[^\s,"]+/gi, 'password=[REDACTED]')
      .replace(/secret["\s:=]+[^\s,"]+/gi, 'secret=[REDACTED]');
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
