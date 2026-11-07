import { RuntimeEnv } from '../types/deployment-profile';

/**
 * Result of a build operation.
 */
export interface BuildResult {
  imageTag: string;
  buildDurationMs: number;
  buildLogs: string;
  success: boolean;
  error?: string;
  /**
   * The port the built application listens on, when the provider knows it.
   *
   * The deployment profile's `defaultPort` is only a guess: a Vite app
   * listens on 4173, Astro on 4321 and SvelteKit on 5173, but all of them
   * were routed to the profile's 3000 and answered every request with a
   * 404. The provider detects the real port, so it has to survive the
   * build → deploy boundary. Undefined means "use the profile default".
   */
  port?: number;
}

/**
 * Result of a deploy operation.
 */
export interface DeployResult {
  containerId: string;
  deploymentUrl: string;
  deployDurationMs: number;
  success: boolean;
  error?: string;
}

/**
 * Context passed to a BuildProvider containing everything it needs to build.
 */
export interface BuildContext {
  deploymentId: string;
  releaseId: string;
  projectId: string;
  projectSlug: string;
  projectType: string;
  releaseVersion: string;  // immutable version string for Docker image tag
  source: {
    type: 'git' | 'archive';
    url?: string;
    branch?: string;
    credentials?: string;
    dockerfilePath?: string;
    /** For archive sources: the storage bucket ID + object key to download. */
    archiveBucketId?: string;
    archiveObjectKey?: string;
  };
  buildCommand?: string;
  outputDirectory?: string;
  /** For monorepos: the app/workspace name to build/deploy (e.g. "apps/web", "packages/frontend") */
  buildTarget?: string;
  envVars: RuntimeEnv[];
  onLog: (line: string) => void;
  /**
   * Absolute path to the prepared build workspace. The runner is responsible for
   * creating it (via DockerBuildWorkspaceService.prepareWorkspace), fetching the
   * source into it, and cleaning it up. Providers should treat this as a ready-
   * to-read source tree.
   */
  workspace: string;
}

/**
 * BuildProvider is the pluggable build strategy interface.
 *
 * Implement this to add new build strategies (Dockerfile, buildpack, etc.)
 * without changing the deployment engine.
 *
 * Phase 06 ships with DockerfileBuildProvider only.
 * Future phases will add NodeBuildpackProvider, PythonBuildpackProvider, etc.
 */
export interface BuildProvider {
  /** Human-readable name of this provider */
  name: string;

  /**
   * Validate that the source can be built by this provider.
   * Called before build starts — should fail fast with a descriptive message.
   * @throws Error with a user-friendly message if validation fails
   */
  validate(context: BuildContext): Promise<void>;

  /**
   * Execute the build and return a tagged image.
   */
  build(context: BuildContext): Promise<BuildResult>;
}