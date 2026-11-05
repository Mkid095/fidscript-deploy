import { Injectable, BadRequestException } from '@nestjs/common';
import { DockerBuildWorkspaceService } from '@/modules/deployments/providers/docker-build-workspace.service';
import { NodeBuildpackProvider } from '@/modules/deployments/providers/node-buildpack.provider';
import { UserGithubService } from '@/modules/app-auth/services/user-github.service';

/**
 * What is in a repository, before a project exists.
 *
 * The wizard shows the operator the application preset — Next.js, Vite, a
 * Node service — BEFORE they commit to a project, so they can see what the
 * platform made of their code while they are still choosing where it goes.
 *
 * Only a github.com repository is accepted here: the endpoint clones a URL
 * the caller supplies, and a URL that can point anywhere on the network is
 * a request the server should not make on someone's behalf. Any other git
 * host is detected after the project exists, through the project's own
 * endpoint.
 */
const GITHUB_REPO = /^https:\/\/github\.com\/[^/\s]+\/[^/\s]+(\.git)?\/?$/i;

@Injectable()
export class DeploymentDetectService {
  constructor(
    private workspace: DockerBuildWorkspaceService,
    private buildpackProvider: NodeBuildpackProvider,
    private github: UserGithubService,
  ) {}

  /** Clone the repository shallowly and report what the platform found. */
  async detectRepository(userId: string, dto: { gitUrl: string; branch?: string }) {
    const url = dto.gitUrl?.trim() ?? '';
    if (!GITHUB_REPO.test(url)) {
      throw new BadRequestException(
        'Only a github.com repository can be inspected before the project exists.',
      );
    }

    const ws = this.workspace.prepareWorkspace();
    try {
      // The operator's own GitHub token, so a private repository is cloned
      // without a prompt (which would fail in the non-TTY server).
      const credentials = (await this.github.getCloneCredentials(userId)) ?? undefined;
      await this.workspace.fetchGitSource({
        url,
        branch: dto.branch || 'main',
        credentials,
        workspace: ws,
      });
      const info = await this.buildpackProvider.detectFramework(ws);
      return this.buildpackProvider.toBuildPlan(info);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Framework detection failed';
      throw new BadRequestException(message);
    } finally {
      this.workspace.cleanupWorkspace(ws);
    }
  }
}
