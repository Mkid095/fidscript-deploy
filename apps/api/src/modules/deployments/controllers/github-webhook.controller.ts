/**
 * GitHub webhook receiver — handles push events for auto-deploy.
 *
 * POST /api/v1/webhooks/github (unguarded — validated via HMAC signature)
 *
 * On a `push` event:
 *   1. Verifies X-Hub-Signature-256 against the project's stored secret.
 *   2. Finds the matching project by repo URL.
 *   3. Checks if the pushed branch matches the project's source branch.
 *   4. If autoDeploy is enabled, creates a new Deployment with the new commit SHA.
 *   5. Returns 200 fast (processing is async) so GitHub doesn't retry.
 *
 * Also responds to ping events with a simple 200.
 */
import { Controller, Post, Req, HttpCode, HttpStatus, Logger } from '@nestjs/common';
import type { Request } from 'express';
import { GithubWebhookService } from '../services/github-webhook.service';
import { DeploymentCrudService } from '../services/deployment-crud.service';
import { PrismaService } from '@/prisma/prisma.service';
import { SourceType } from '../dto/create-deployment.dto';

@Controller('webhooks/github')
export class GithubWebhookController {
  private readonly logger = new Logger(GithubWebhookController.name);

  constructor(
    private webhookService: GithubWebhookService,
    private crudService: DeploymentCrudService,
    private prisma: PrismaService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  async handleWebhook(@Req() req: Request): Promise<{ status: string }> {
    const event = req.headers['x-github-event'] as string | undefined;
    const signature = req.headers['x-hub-signature-256'] as string | undefined;

    // GitHub ping event — just acknowledge
    if (event === 'ping') {
      this.logger.log('Received GitHub ping event');
      return { status: 'pong' };
    }

    // Only handle push events
    if (event !== 'push') {
      return { status: 'ignored' };
    }

    const body = req.body as Record<string, unknown>;
    const payload = this.webhookService.parsePushEvent(body);
    if (!payload) {
      this.logger.warn('Could not parse push event payload');
      return { status: 'error' };
    }

    // Find the project by repo URL
    const project = await this.webhookService.findProjectByRepo(payload.repoFullName);
    if (!project) {
      this.logger.log(`No project found for repo ${payload.repoFullName} — ignoring`);
      return { status: 'no_project' };
    }

    // Load the full project (need webhookSecret for verification)
    const fullProject = await this.prisma.project.findUnique({
      where: { id: project.id },
      select: { id: true, webhookSecret: true, sourceBranch: true, autoDeploy: true },
    });
    if (!fullProject) return { status: 'error' };

    // Verify HMAC signature
    const rawBody = JSON.stringify(body);
    if (!this.webhookService.verifySignature(fullProject, rawBody, signature)) {
      this.logger.warn(`Invalid webhook signature for project ${project.id}`);
      return { status: 'invalid_signature' };
    }

    // Check if the pushed branch matches the project's deploy branch
    if (payload.branch !== fullProject.sourceBranch) {
      this.logger.log(`Push to ${payload.branch} but project deploys ${fullProject.sourceBranch} — ignoring`);
      return { status: 'branch_mismatch' };
    }

    // Check autoDeploy is enabled
    if (!fullProject.autoDeploy) {
      this.logger.log(`Auto-deploy disabled for project ${project.id} — ignoring`);
      return { status: 'auto_deploy_disabled' };
    }

    // Trigger a new deployment (async — return 200 immediately)
    this.triggerDeploy(project.id, payload).catch(err => {
      this.logger.error(`Auto-deploy failed for project ${project.id}: ${err instanceof Error ? err.message : String(err)}`);
    });

    this.logger.log(`Auto-deploy triggered for project ${project.id} (commit ${payload.commitSha.slice(0, 7)})`);
    return { status: 'deploying' };
  }

  /**
   * Create a new deployment for the pushed commit. Fire-and-forget from the
   * webhook handler — errors are logged but don't affect the HTTP response.
   */
  private async triggerDeploy(projectId: string, payload: { commitSha: string; commitMessage: string; branch: string; repoFullName: string }) {
    // Find the owner to pass as the triggering user
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      select: { ownerId: true, sourceRepo: true },
    });
    if (!project) return;

    await this.crudService.create(project.ownerId, projectId, {
      source: {
        type: SourceType.GIT,
        git: {
          url: project.sourceRepo ?? `https://github.com/${payload.repoFullName}.git`,
          branch: payload.branch,
        },
      },
      branch: payload.branch,
      commitSha: payload.commitSha,
      commitMessage: payload.commitMessage.slice(0, 200),
    } as any);
  }
}
