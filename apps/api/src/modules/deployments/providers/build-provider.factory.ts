/**
 * BuildProviderFactory — selects the appropriate build provider based on
 * project type and source characteristics.
 *
 * Selection logic:
 *  1. If source has an explicit Dockerfile path → DockerfileBuildProvider
 *  2. If project type is DOCKER/WORKER/CRON → DockerfileBuildProvider
 *     (these require custom Dockerfiles)
 *  3. Otherwise (FRONTEND/STATIC/BACKEND with no Dockerfile) → NodeBuildpackProvider
 *
 * This ensures:
 *  - Frontend apps (Next.js, Nuxt, Astro, Vite, static HTML) deploy without a Dockerfile
 *  - Backend/custom Docker projects still use their Dockerfile
 *  - All project types respect an explicitly-provided Dockerfile path
 */
import { Injectable, Logger } from '@nestjs/common';
import { BuildProvider } from './build-provider.interface';
import { DockerfileBuildProvider } from './dockerfile-build.provider';
import { NodeBuildpackProvider } from './node-buildpack.provider';

@Injectable()
export class BuildProviderFactory {
  private readonly logger = new Logger(BuildProviderFactory.name);

  constructor(
    private dockerfileProvider: DockerfileBuildProvider,
    private buildpackProvider: NodeBuildpackProvider,
  ) {}

  /**
   * Select the appropriate build provider for a deployment.
   *
   * @param projectType  - The project type (FRONTEND, BACKEND, STATIC, DOCKER, etc.)
   * @param source       - The deployment source (git or archive)
   * @param projectSlug  - Used for logging
   */
  getProvider(projectType: string, source: { dockerfilePath?: string; type: string; url?: string }, projectSlug: string): BuildProvider {
    const upperType = projectType.toUpperCase();

    // Explicit Dockerfile path → always use DockerfileBuildProvider
    if (source.dockerfilePath) {
      this.logger.log(`[factory] ${projectSlug}: explicit dockerfilePath='${source.dockerfilePath}' → DockerfileBuildProvider`);
      return this.dockerfileProvider;
    }

    // Docker/worker/cron types require a custom Dockerfile
    if (['DOCKER', 'WORKER', 'CRON'].includes(upperType)) {
      this.logger.log(`[factory] ${projectSlug}: type=${upperType} → DockerfileBuildProvider`);
      return this.dockerfileProvider;
    }

    // FRONTEND, STATIC, BACKEND (and any other type with no explicit Dockerfile):
    // Use NodeBuildpackProvider which auto-detects Next.js, Vite, or static HTML
    // and builds them without requiring a Dockerfile. DockerfileBuildProvider is
    // still used when source.dockerfilePath is set.
    this.logger.log(`[factory] ${projectSlug}: type=${upperType} → NodeBuildpackProvider`);
    return this.buildpackProvider;
  }
}
