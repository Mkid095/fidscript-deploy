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
}

export interface DeploymentListResult {
  deployments: Deployment[];
  pagination: { page: number; limit: number; total: number; pages: number };
}

export interface BuildConfig {
  strategy: string;
  buildCommand?: string;
  outputDirectory?: string;
  healthCheckPath?: string;
  healthCheckPort: number;
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
  strategy?: string;
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

  async rollback(projectId: string, deploymentId: string) {
    return this.client.post<Deployment>(
      `/api/v1/projects/${projectId}/deployments/${deploymentId}/rollback`,
    );
  }

  async getBuildConfig(projectId: string) {
    return this.client.get<BuildConfig>(`/api/v1/projects/${projectId}/build-config`);
  }

  async updateBuildConfig(projectId: string, data: Partial<BuildConfig>) {
    return this.client.patch<BuildConfig>(`/api/v1/projects/${projectId}/build-config`, data);
  }
}
