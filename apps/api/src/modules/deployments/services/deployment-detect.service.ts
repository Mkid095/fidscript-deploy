import { Injectable, BadRequestException } from '@nestjs/common';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
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

/** The files a repository uses to say which variables it wants. */
const ENV_EXAMPLE_FILES = ['.env.example', '.env.sample', '.env.template'];

/**
 * The variable names a `.env.example` asks for — the names only, never a
 * value: an example file's placeholder is not a secret, but it is not a
 * value either, and the wizard's rows are for the operator to fill.
 */
export function readEnvExampleKeys(workspace: string): string[] {
  const keys = new Set<string>();
  for (const name of ENV_EXAMPLE_FILES) {
    const path = join(workspace, name);
    if (!existsSync(path)) continue;
    try {
      const text = readFileSync(path, 'utf8');
      for (const line of text.split('\n')) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        const eq = trimmed.indexOf('=');
        if (eq <= 0) continue;
        const key = trimmed.slice(0, eq).trim().replace(/^export\s+/, '');
        if (/^[A-Z][A-Z0-9_]*$/.test(key)) keys.add(key);
      }
    } catch {
      // A file that cannot be read is not a failure of detection.
    }
  }
  return Array.from(keys);
}

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
      // The variables the repository itself asks for, from its own
      // .env.example — the wizard pre-fills the names and leaves the values
      // to the person, so nothing guessed is ever sent.
      const envSuggestions = readEnvExampleKeys(ws);
      return { ...plan, apps, envSuggestions };
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Framework detection failed';
      throw new BadRequestException(message);
    } finally {
      this.workspace.cleanupWorkspace(ws);
    }
  }
}
