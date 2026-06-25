/**
 * GitHub webhook service — registers and validates push-to-deploy webhooks.
 *
 * When a project's first git deployment succeeds, we register a webhook on
 * the GitHub repo so future pushes auto-trigger a new deployment.
 *
 * Flow:
 *   registerWebhook(projectId, repoFullName)
 *     → generates a per-project HMAC secret (stored encrypted)
 *     → POST https://api.github.com/repos/:owner/:repo/hooks
 *     → stores the GitHub hook ID + secret on the Project
 *
 *   verifySignature(project, body, signatureHeader)
 *     → HMAC-SHA256 comparison (timing-safe) against the stored secret
 *
 * The webhook receiver controller handles `push` events by creating a new
 * Deployment via DeploymentCrudService, which emits the created event and
 * the worker picks it up for build + deploy.
 */
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { PrismaService } from '@/prisma/prisma.service';
import { CryptoService } from '@/modules/crypto/crypto.service';

const GITHUB_API = 'https://api.github.com';

export interface PushEventPayload {
  repoFullName: string;     // "owner/repo"
  ref: string;              // "refs/heads/main"
  branch: string;           // "main"
  commitSha: string;        // "abc123..."
  commitMessage: string;
  pusherName: string;
}

@Injectable()
export class GithubWebhookService {
  private readonly logger = new Logger(GithubWebhookService.name);

  constructor(
    private prisma: PrismaService,
    private cryptoService: CryptoService,
    private config: ConfigService,
  ) {}

  /**
   * Register a webhook on the given GitHub repo. Idempotent — if a hook is
   * already registered (githubHookId set), it's a no-op.
   *
   * Requires the user's GitHub token (fetched by the caller from the
   * encrypted GithubConnection).
   */
  async registerWebhook(projectId: string, repoFullName: string, githubToken: string): Promise<void> {
    const project = await this.prisma.project.findUnique({ where: { id: projectId } });
    if (!project) throw new Error(`Project ${projectId} not found`);
    if (project.githubHookId) {
      this.logger.log(`Webhook already registered for ${projectId} (hook #${project.githubHookId})`);
      return;
    }

    // Generate + encrypt a per-project secret.
    const secret = crypto.randomBytes(24).toString('hex');
    const encryptedSecret = this.cryptoService.encrypt(secret);

    const platformDomain = this.config.get<string>('PLATFORM_DOMAIN', 'deploy.fidscript.com');
    const payloadUrl = `https://${platformDomain}/api/v1/webhooks/github`;

    const res = await fetch(`${GITHUB_API}/repos/${repoFullName}/hooks`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${githubToken}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        config: {
          url: payloadUrl,
          content_type: 'json',
          secret,
          insecure_ssl: '0',
        },
        events: ['push'],
        active: true,
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`GitHub webhook registration failed (${res.status}): ${text}`);
    }

    const hook = await res.json() as { id: number };
    await this.prisma.project.update({
      where: { id: projectId },
      data: { webhookSecret: encryptedSecret, githubHookId: hook.id, sourceRepo: `https://github.com/${repoFullName}` },
    });
    this.logger.log(`Registered GitHub webhook #${hook.id} for ${repoFullName} (project ${projectId})`);
  }

  /**
   * Verify the X-Hub-Signature-256 header against the project's stored secret.
   * Uses timingSafeEqual to prevent timing attacks.
   */
  verifySignature(project: { webhookSecret: string | null }, rawBody: string, signatureHeader: string | undefined): boolean {
    if (!project.webhookSecret || !signatureHeader) return false;

    let secret: string;
    try {
      secret = this.cryptoService.decrypt(project.webhookSecret);
    } catch {
      return false;
    }

    const expected = 'sha256=' + crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
    const a = Buffer.from(expected);
    const b = Buffer.from(signatureHeader);
    return a.length === b.length && crypto.timingSafeEqual(a, b);
  }

  /**
   * Parse a GitHub push event payload into our simplified shape.
   */
  parsePushEvent(body: any): PushEventPayload | null {
    if (!body?.ref?.startsWith('refs/heads/')) return null;
    const repo = body.repository?.full_name;
    if (!repo) return null;
    return {
      repoFullName: repo,
      ref: body.ref,
      branch: body.ref.replace('refs/heads/', ''),
      commitSha: body.after ?? '',
      commitMessage: body.head_commit?.message ?? body.commits?.[0]?.message ?? '',
      pusherName: body.pusher?.name ?? body.sender?.login ?? 'unknown',
    };
  }

  /**
   * Find a project by its source repo URL. Matches either the full GitHub URL
   * or the owner/repo shorthand.
   */
  async findProjectByRepo(repoFullName: string): Promise<{ id: string; sourceBranch: string; autoDeploy: boolean } | null> {
    const urlVariants = [
      `https://github.com/${repoFullName}`,
      `https://github.com/${repoFullName}.git`,
      `git@github.com:${repoFullName}.git`,
    ];
    const project = await this.prisma.project.findFirst({
      where: {
        OR: [
          { sourceRepo: { in: urlVariants } },
          { sourceRepo: { contains: repoFullName } },
        ],
        deletedAt: null,
      },
      select: { id: true, sourceBranch: true, autoDeploy: true },
    });
    return project ?? null;
  }
}
