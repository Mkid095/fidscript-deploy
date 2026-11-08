import { Injectable, BadRequestException } from '@nestjs/common';
import { DockerBuildWorkspaceService } from '@/modules/deployments/providers/docker-build-workspace.service';
import { NodeBuildpackProvider } from '@/modules/deployments/providers/node-buildpack.provider';
import { UserGithubService } from '@/modules/app-auth/services/user-github.service';

/**
 * What is in a repository.
 *
 * The wizard shows the operator the application preset — Next.js, Vite, a
 * Node service — before anything is built, so they can see what the
 * platform made of their code while they are still choosing. The URL the
 * caller supplies is cloned exactly as the deployment would clone it: the
 * endpoint is authenticated, project-scoped, and no more able to reach the
 * network than the deployment it describes.
 */

@Injectable()
export class DeploymentDetectService {
  constructor(
    private workspace: DockerBuildWorkspaceService,
    private buildpackProvider: NodeBuildpackProvider,
    private github: UserGithubService,
  ) {}

  /** Clone the repository shallowly and report what the platform found. */
  async detectRepository(
    userId: string,
    dto: { gitUrl: string; branch?: string },
  ) {
    const url = dto.gitUrl?.trim() ?? '';
    if (!url) throw new BadRequestException('A git repository URL is needed.');

    const ws = this.workspace.prepareWorkspace();
    try {
      // The operator's own GitHub token, so a private repository is cloned
      // without a prompt (which would fail in the non-TTY server).
      const credentials =
        (await this.github.getCloneCredentials(userId)) ?? undefined;
      await this.workspace.fetchGitSource({
        url,
        branch: dto.branch || 'main',
        credentials,
        workspace: ws,
      });
      const info = await this.buildpackProvider.detectFramework(ws);
      const plan = this.buildpackProvider.toBuildPlan(info);
      // A repository that is more than one application says so now, with the
      // list — the wizard offers them instead of the operator discovering a
      // half-deployed application later.
      const apps = plan.monorepo
        ? await this.buildpackProvider.listMonorepoApps(ws)
        : [];
      return { ...plan, apps };
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Framework detection failed';
      throw new BadRequestException(message);
    } finally {
      this.workspace.cleanupWorkspace(ws);
    }
  }
}
