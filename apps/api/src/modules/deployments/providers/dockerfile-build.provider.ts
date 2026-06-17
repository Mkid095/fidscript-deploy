import { Injectable, Logger } from '@nestjs/common';
import { existsSync, writeFileSync } from 'fs';
import { join } from 'path';
import {
  BuildProvider,
  BuildContext,
  BuildResult,
} from './build-provider.interface';
import { DockerBuildWorkspaceService } from './docker-build-workspace.service';

@Injectable()
export class DockerfileBuildProvider implements BuildProvider {
  name = 'dockerfile';
  private readonly logger = new Logger(DockerfileBuildProvider.name);

  constructor(private workspace: DockerBuildWorkspaceService) {}

  async validate(context: BuildContext): Promise<void> {
    const { source } = context;
    const ws = this.workspace.prepareWorkspace();

    try {
      if (source.type === 'git') {
        await this.workspace.fetchGitSource({
          url: source.url!,
          branch: source.branch || 'main',
          credentials: source.credentials,
          workspace: ws,
        });
      } else {
        throw new Error('Archive source not yet supported by DockerfileBuildProvider. Use source.type=git.');
      }

      const dockerfilePath = source.dockerfilePath
        || (existsSync(join(ws, 'Dockerfile')) ? 'Dockerfile' : null);

      if (!dockerfilePath) {
        throw new Error(
          'No Dockerfile found in the source root. ' +
          'Provide a Dockerfile in your repository root, ' +
          'or specify source.git.dockerfilePath in the deployment request.',
        );
      }

      if (!existsSync(join(ws, dockerfilePath))) {
        throw new Error(`Dockerfile specified at "${dockerfilePath}" does not exist in the source.`);
      }

      this.logger.log(`[DockerfileBuildProvider] Validation passed for ${context.projectSlug}`);
    } finally {
      this.workspace.cleanupWorkspace(ws);
    }
  }

  async build(context: BuildContext): Promise<BuildResult> {
    const { source, envVars, onLog } = context;
    const ws = this.workspace.prepareWorkspace();
    const startTime = Date.now();
    const logs: string[] = [];

    const addLog = (l: string) => { logs.push(l); onLog(l); };

    try {
      if (source.type === 'git') {
        await this.workspace.fetchGitSource({
          url: source.url!,
          branch: source.branch || 'main',
          credentials: source.credentials,
          workspace: ws,
        });
      }

      const dockerfilePath = source.dockerfilePath
        || (existsSync(join(ws, 'Dockerfile')) ? 'Dockerfile' : 'Dockerfile');

      addLog(`[DockerfileBuildProvider] Building with Dockerfile: ${dockerfilePath}`);

      if (envVars.length > 0) {
        const envFilePath = join(ws, '.fidscript.env');
        const envFileContent = envVars.map(e => `${e.key}=${e.value}`).join('\n');
        writeFileSync(envFilePath, envFileContent, { mode: 0o600 });
        addLog(`[DockerfileBuildProvider] Wrote ${envVars.length} env vars to .fidscript.env (secret)`);
      }

      const imageTag = `fidscript/${context.projectSlug}:${context.releaseVersion}`;
      let buildCmd = `docker build -t "${imageTag}" -f "${dockerfilePath}" "${ws}"`;

      if (envVars.length > 0) {
        buildCmd += ` --secret id=envfile,src="${join(ws, '.fidscript.env')}"`;
      }

      addLog(`[DockerfileBuildProvider] docker build ${imageTag}`);
      const output = this.workspace.exec(buildCmd, { timeout: 600_000 });
      addLog(output);

      return {
        imageTag,
        buildDurationMs: Date.now() - startTime,
        buildLogs: logs.join('\n'),
        success: true,
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      addLog(`[DockerfileBuildProvider] Build error: ${msg}`);
      return {
        imageTag: `fidscript/${context.projectSlug}:${context.releaseVersion}`,
        buildDurationMs: Date.now() - startTime,
        buildLogs: logs.join('\n'),
        success: false,
        error: msg,
      };
    } finally {
      this.workspace.cleanupWorkspace(ws);
    }
  }
}
