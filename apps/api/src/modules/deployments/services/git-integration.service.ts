import {
  Injectable,
  ConflictException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { CryptoService } from '@/modules/crypto/crypto.service';
import { GithubWebhookService } from './github-webhook.service';

/**
 * The Git integration of a project, as one place to read and repair it.
 *
 * What the console's Git section shows — the connected account, the
 * repository and branch, whether pushes deploy, whether the webhook is
 * registered, what production last ran — and the two repairs: the
 * auto-deploy switch, and re-registering a webhook GitHub lost.
 */
@Injectable()
export class GitIntegrationService {
  private readonly logger = new Logger(GitIntegrationService.name);

  constructor(
    private prisma: PrismaService,
    private crypto: CryptoService,
    private webhook: GithubWebhookService,
  ) {}

  /**
   * The state of the project's Git integration.
   * `deploymentInitialized` is the ONE-deployment-identity rule in the
   * UI's words: whether this project's deployment history already exists.
   */
  async status(
    userId: string,
    projectId: string,
  ): Promise<Record<string, unknown>> {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      include: { owner: { select: { id: true } } },
    });
    if (!project) throw new NotFoundException('Project not found');
    // The project's access is enforced by the controller's guards; this
    // service reads as the caller.
    void userId;

    const connection = project.owner
      ? await this.prisma.githubConnection.findUnique({
          where: { userId: project.owner.id },
        })
      : null;

    const lastRelease = await this.prisma.release.findFirst({
      where: { projectId },
      orderBy: { createdAt: 'desc' },
    });
    const lastSuccess = await this.prisma.deployment.findFirst({
      where: { projectId, status: 'SUCCESS' },
      orderBy: { completedAt: 'desc' },
      select: { id: true, deploymentUrl: true, completedAt: true },
    });
    const identity = await this.prisma.deploymentIdentity.findUnique({
      where: { projectId },
    });

    const tokenExpired =
      !!connection?.tokenExpiresAt && connection.tokenExpiresAt < new Date();

    return {
      connected: !!connection,
      account: connection?.username ?? null,
      tokenHealthy: !!connection && !tokenExpired,
      tokenNote: tokenExpired
        ? 'The GitHub connection has expired — reconnect it to keep webhooks and clones working.'
        : null,
      repository: project.sourceRepo,
      branch: project.sourceBranch,
      autoDeploy: project.autoDeploy,
      webhook: {
        registered: project.githubHookId !== null,
        hookId: project.githubHookId,
      },
      lastCommit: lastRelease
        ? {
            sha: lastRelease.commitSha,
            message: lastRelease.commitMessage,
            at: lastRelease.createdAt,
          }
        : null,
      lastSuccess,
      lastDeployedCommit: project.lastDeployedCommit,
      deploymentInitialized: !!identity,
    };
  }

  /**
   * Register the webhook again — for when GitHub lost it (the owner
   * cleaned up their hooks, the repo was transferred, the token was
   * replaced). The old registration is dropped and a fresh one takes
   * its place under the same delivery endpoint.
   */
  async reconnectWebhook(
    userId: string,
    projectId: string,
  ): Promise<{ hookId: number; repository: string }> {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      include: { owner: { select: { id: true } } },
    });
    if (!project) throw new NotFoundException('Project not found');

    if (!project.sourceRepo?.includes('github.com')) {
      throw new ConflictException(
        'This project has no GitHub repository to connect a webhook to — deploy from Git once, and the webhook registers itself.',
      );
    }

    // The owner's own token: the webhook belongs to their repositories.
    const connection = project.owner
      ? await this.prisma.githubConnection.findUnique({
          where: { userId: project.owner.id },
        })
      : null;
    if (!connection?.encryptedToken) {
      throw new ConflictException(
        'The project owner has no GitHub connection — connect one first, and the webhook can be registered with it.',
      );
    }
    void userId;

    const token = this.crypto.decrypt(connection.encryptedToken);
    const repoFullName = project.sourceRepo
      .replace(/^https:\/\/github\.com\//, '')
      .replace(/^git@github\.com:/, '')
      .replace(/\.git$/, '');

    // The previous registration is dropped first: two hooks on one repo
    // would deliver every push twice.
    await this.prisma.project.update({
      where: { id: projectId },
      data: { githubHookId: null, webhookSecret: null },
    });
    await this.webhook.registerWebhook(projectId, repoFullName, token);
    const fresh = await this.prisma.project.findUnique({ where: { id: projectId } });
    this.logger.log(
      `[git-integration] webhook re-registered for ${repoFullName} (hook #${fresh?.githubHookId})`,
    );
    return { hookId: fresh!.githubHookId!, repository: repoFullName };
  }
}
