import { FidscriptClient } from '../client';

export interface Deployment {
  id: string;
  projectId: string;
  releaseId: string | null;
  status: string;
  deploymentUrl: string | null;
  rolledBackToId: string | null;
  createdAt: string;
  completedAt: string | null;
  // Enriched fields from the API response
  branch?: string;
  commitSha?: string;
  commitMessage?: string;
  imageTag?: string;
  sourceUrl?: string;
  sourceType?: 'git' | 'archive';
  createdBy?: string;
}

export interface DeploymentListResult {
  deployments: Deployment[];
  pagination: { page: number; limit: number; total: number; pages: number };
}

/**
 * Build configuration for a project.
 * Only buildTarget (monorepo app root) and startupTimeoutSeconds are
 * consumed by the deployment runner — all other fields were dead code
 * that the build providers ignored (they re-derive everything from
 * package.json detection).
 */
export interface BuildConfig {
  buildTarget?: string;
  startupTimeoutSeconds?: number;
}

/**
 * Framework detection result returned by POST /deployments/detect.
 * This is the "BuildPlan" — what the platform detected and how it
 * will build the project, shown to the user before they deploy.
 */
export interface BuildPlan {
  framework: string;          // 'next' | 'vite' | 'astro' | 'nuxt' | 'sveltekit' | 'node' | 'static' | 'unknown'
  frameworkLabel: string;     // 'Next.js', 'Vite', 'Astro', etc.
  frameworkVersion?: string;  // e.g. '15.2.0' from package.json
  buildCommand: string;       // 'npm run build'
  startCommand: string;       // 'npx next start'
  outputDirectory: string;    // '.next', 'dist', '.'
  port: number;               // 3000, 4173, 8080, etc.
  runtime: string;            // 'Node 20'
  monorepo?: string;          // 'pnpm' | 'turbo' | 'nx' | undefined
  detectedAt: string;         // ISO timestamp
}

export interface CreateDeploymentInput {
  source?: {
    type: 'git' | 'archive';
    git?: {
      url?: string;
      credentials?: string;
      branch?: string;
      dockerfilePath?: string;
    };
    archive?: {
      bucketId?: string;
      objectKey?: string;
      dockerfilePath?: string;
    };
  };
  branch?: string;
  commitSha?: string;
  commitMessage?: string;
  /** Environment variables to inject at build and runtime. Overrides project-level env vars. */
  envVars?: Record<string, string>;
}

export interface DetectInput {
  gitUrl: string;
  branch?: string;
  credentials?: string;
}

export class DeploymentsModule {
  constructor(private client: FidscriptClient) {}

  async list(projectId: string, options?: { page?: number; limit?: number; status?: string }) {
    const params: Record<string, string> = {};
    if (options?.page) params.page = String(options.page);
    if (options?.limit) params.limit = String(options.limit);
    if (options?.status) params.status = options.status;
    return this.client.get<DeploymentListResult>(
      `/api/v1/projects/${projectId}/deployments`,
      params,
    );
  }

  async get(projectId: string, deploymentId: string) {
    return this.client.get<Deployment>(
      `/api/v1/projects/${projectId}/deployments/${deploymentId}`,
    );
  }

  async create(projectId: string, data: CreateDeploymentInput) {
    return this.client.post<Deployment>(
      `/api/v1/projects/${projectId}/deployments`,
      data,
    );
  }

  /**
   * Detect the framework/build plan for a repository without deploying.
   * Clones the repo shallowly, runs framework detection, returns the BuildPlan.
   */
  async detect(projectId: string, data: DetectInput) {
    return this.client.post<BuildPlan>(
      `/api/v1/projects/${projectId}/deployments/detect`,
      data,
    );
  }

  async getLogs(projectId: string, deploymentId: string) {
    return this.client.get<{ logs: string }>(
      `/api/v1/projects/${projectId}/deployments/${deploymentId}/logs`,
    );
  }

  async stop(projectId: string, deploymentId: string) {
    return this.client.post<Deployment>(
      `/api/v1/projects/${projectId}/deployments/${deploymentId}/stop`,
    );
  }

  async restart(projectId: string, deploymentId: string) {
    return this.client.post<Deployment>(
      `/api/v1/projects/${projectId}/deployments/${deploymentId}/restart`,
    );
  }

  async destroy(projectId: string, deploymentId: string) {
    return this.client.delete<{ success: boolean }>(
      `/api/v1/projects/${projectId}/deployments/${deploymentId}`,
    );
  }

  async rollback(projectId: string, deploymentId: string, targetDeploymentId?: string) {
    return this.client.post<Deployment>(
      `/api/v1/projects/${projectId}/deployments/${deploymentId}/rollback`,
      targetDeploymentId ? { targetDeploymentId } : {},
    );
  }

  async getBuildConfig(projectId: string) {
    return this.client.get<BuildConfig>(`/api/v1/projects/${projectId}/build-config`);
  }

  async updateBuildConfig(projectId: string, data: Partial<BuildConfig>) {
    return this.client.patch<BuildConfig>(`/api/v1/projects/${projectId}/build-config`, data);
  }
}
