import { Injectable, Logger } from '@nestjs/common';
import { existsSync, writeFileSync } from 'fs';
import { join, isAbsolute } from 'path';
import {
  BuildProvider,
  BuildContext,
  BuildResult,
} from './build-provider.interface';
import { ShellRunnerService } from '../runner/shell-runner.service';

@Injectable()
export class DockerfileBuildProvider implements BuildProvider {
  constructor(private shell: ShellRunnerService) {}

  name = 'dockerfile';
  private readonly logger = new Logger(DockerfileBuildProvider.name);

  // The workspace lifecycle (prepare / fetch source / cleanup) is owned by
  // BuildRunnerService. This provider only reads from `context.workspace`.

  async validate(context: BuildContext): Promise<void> {
    const { source, workspace: ws } = context;

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
  }

  async build(context: BuildContext): Promise<BuildResult> {
    const { source, envVars, onLog, workspace: ws } = context;
    const startTime = Date.now();
    const logs: string[] = [];

    const addLog = (l: string) => { logs.push(l); onLog(l); };

    try {
      if (source.type === 'archive') {
        addLog(`[DockerfileBuildProvider] Archive extracted to build workspace`);
      }

      // `docker build -f <path>` resolves a RELATIVE path against the process
      // CWD (/app), NOT the build context — so a bare "Dockerfile" would point
      // at /app/Dockerfile and fail to read. Pin it to an absolute workspace path.
      const requestedPath = source.dockerfilePath || 'Dockerfile';
      const dockerfilePath = isAbsolute(requestedPath) ? requestedPath : join(ws, requestedPath);

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
      // Asynchronous and streaming: a build can run for ten minutes, and
      // blocking the api for that long stops every other request — including
      // the one watching this build.
      await this.shell.runStreaming(buildCmd, addLog, { timeout: 600_000 });

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
    }
  }

}
