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
import { AuthRateLimiter } from '@/common/auth-rate-limiter.service';
import { extractRequestContext } from '@/common/request-context';
import { SourceType } from '../dto/create-deployment.dto';
import { Public } from '@/modules/auth/decorators/public.decorator';

/**
 * The receiver is public — anyone who finds the URL can post to it — so it
 * is throttled like the door it is: a bucket per address and a bucket per
 * repository. The signature check still stands behind the limit; the
 * limiter only keeps the abuse from being expensive.
 */
const WEBHOOK_IP_LIMIT = 120; // deliveries per hour, per address
const WEBHOOK_REPO_LIMIT = 30; // pushes per hour, per repository

@Controller('webhooks/github')
export class GithubWebhookController {
  private readonly logger = new Logger(GithubWebhookController.name);

  constructor(
    private webhookService: GithubWebhookService,
    private crudService: DeploymentCrudService,
    private prisma: PrismaService,
    private rateLimiter: AuthRateLimiter,
  ) {}

  @Post()

  @Public()
  @HttpCode(HttpStatus.OK)
  async handleWebhook(@Req() req: Request): Promise<{ status: string }> {
    // The door is throttled before anything else: an address may not flood
    // the receiver, and a repository may not queue the build lane for an
    // hour, whatever the address behind it is.
    const { ipAddress } = extractRequestContext(req);
    const ipCheck = await this.rateLimiter.consume(
      `rl:webhook:ip:${ipAddress ?? 'unknown'}`,
      WEBHOOK_IP_LIMIT,
      3600,
    );
    if (!ipCheck.allowed)
      return this.rateLimited(
        req,
        ipCheck.retryAfter,
        'Too many deliveries from this address.',
      );

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

    // The repository's own bucket: pushes from a well-behaved developer may
    // not look the same as a script that retries every minute.
    const repoCheck = await this.rateLimiter.consume(
      `rl:webhook:repo:${payload.repoFullName}`,
      WEBHOOK_REPO_LIMIT,
      3600,
    );
    if (!repoCheck.allowed)
      return this.rateLimited(
        req,
        repoCheck.retryAfter,
        'Too many pushes for this repository.',
      );

    // Find the project by repo URL
    const project = await this.webhookService.findProjectByRepo(payload.repoFullName);
    if (!project) {
      this.logger.log(`No project found for repo ${payload.repoFullName} — ignoring`);
      return { status: 'no_project' };
    }

    // Load the full project (need webhookSecret for verification)
    const fullProject = await this.prisma.project.findUnique({
      where: { id: project.id },
      select: {
        id: true,
        webhookSecret: true,
        sourceBranch: true,
        autoDeploy: true,
        lastDeployedCommit: true,
      },
    });
    if (!fullProject) return { status: 'error' };

    // Verify HMAC signature
    const rawBody = JSON.stringify(body);
    if (!this.webhookService.verifySignature(fullProject, rawBody, signature)) {
      this.logger.warn(`Invalid webhook signature for project ${project.id}`);
      return { status: 'invalid_signature' };
    }

    // Every delivery is tracked by its id: GitHub retries a delivery it did
    // not see answered with the SAME id, so the id is the dedup key, and the
    // row is the record that says what we did with it.
    const deliveryId =
      (req.headers['x-github-delivery'] as string) ||
      `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    // Check if the pushed branch matches the project's deploy branch
    if (payload.branch !== fullProject.sourceBranch) {
      this.logger.log(`Push to ${payload.branch} but project deploys ${fullProject.sourceBranch} — ignoring`);
      await this.webhookService.recordOutcome(fullProject.id, payload.commitSha, deliveryId, 'branch_mismatch');
      return { status: 'branch_mismatch' };
    }

    // Check autoDeploy is enabled
    if (!fullProject.autoDeploy) {
      this.logger.log(`Auto-deploy disabled for project ${project.id} — ignoring`);
      await this.webhookService.recordOutcome(fullProject.id, payload.commitSha, deliveryId, 'auto_deploy_off');
      return { status: 'auto_deploy_disabled' };
    }

    // The gate: a resended delivery, the already-live commit, or a commit
    // that a newer build superseded is recorded and dropped — it does not
    // take the queue.
    const gate = await this.webhookService.evaluatePush(
      fullProject,
      payload,
      deliveryId,
      new Date(),
    );
    if (gate.outcome !== 'accepted') {
      this.logger.log(`Push of ${payload.commitSha.slice(0, 7)} dropped: ${gate.outcome}`);
      return { status: gate.outcome };
    }

    // Trigger a new deployment (async — return 200 immediately)
    this.triggerDeploy(project.id, payload).catch(err => {
      this.logger.error(`Auto-deploy failed for project ${project.id}: ${err instanceof Error ? err.message : String(err)}`);
    });

    this.logger.log(`Auto-deploy triggered for project ${project.id} (commit ${payload.commitSha.slice(0, 7)})`);
    return { status: 'deploying' };
  }

  /**
   * Say "too fast" in the shape GitHub understands: 429 and a Retry-After.
   * The receiver answers fast either way, so GitHub will not keep retrying
   * a throttled delivery.
   */
  private rateLimited(req: Request, retryAfter: number, note: string): { status: string; note?: string } {
    req.res
      ?.status(HttpStatus.TOO_MANY_REQUESTS)
      .set('Retry-After', String(Math.max(1, retryAfter)));
    this.logger.warn(`Webhook throttled: ${note}`);
    return { status: 'rate_limited', note };
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

    // The hostname follows the deployment. A push that created the
    // deployment without it would leave the name pointing at the previous
    // container — which the success path tears down — and the domain
    // would serve a 502 from that moment on.
    const current = await this.prisma.domain.findFirst({
      where: { projectId },
      orderBy: [{ isPrimary: 'desc' }, { createdAt: 'desc' }],
      select: { id: true, isCustom: true, domain: true },
    });

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
      ...(current?.isCustom
        ? { domainId: current.id }
        : current
          ? { subdomain: current.domain.split('.')[0] }
          : {}),
    } as any);
  }
}
