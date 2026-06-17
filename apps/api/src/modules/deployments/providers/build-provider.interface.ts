import { RuntimeEnv } from '../runner/build-runner.service';

/**
 * Result of a build operation.
 */
export interface BuildResult {
  imageTag: string;
  buildDurationMs: number;
  buildLogs: string;
  success: boolean;
  error?: string;
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
  projectId: string;
  projectSlug: string;
  projectType: string;
  version: string;
  source: {
    type: 'git' | 'archive';
    url?: string;
    branch?: string;
    credentials?: string;
    dockerfilePath?: string;
  };
  buildCommand?: string;
  outputDirectory?: string;
  envVars: RuntimeEnv[];
  onLog: (line: string) => void;
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