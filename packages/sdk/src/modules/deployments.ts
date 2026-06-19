import { FidscriptClient } from '../client';

export interface Deployment {
  id: string;
  projectId: string;
  status: string;
  version: string;
  commitSha?: string;
  deploymentUrl?: string;
  createdAt: string;
  completedAt?: string;
}

export interface BuildLog {
  timestamp: string;
  message: string;
  level: string;
}

export class DeploymentsModule {
  constructor(private client: FidscriptClient) {}

  async list(projectId: string) {
    const res = await this.client.get<{ deployments: Deployment[] }>(
      `/api/v1/projects/${projectId}/deployments`,
    );
    return res.deployments;
  }

  async get(projectId: string, deploymentId: string) {
    return this.client.get<Deployment>(`/api/v1/projects/${projectId}/deployments/${deploymentId}`);
  }

  async create(projectId: string, data: { sourceRepo?: string; sourceBranch?: string }) {
    return this.client.post<Deployment>(`/api/v1/projects/${projectId}/deployments`, data);
  }

  async rollback(projectId: string, deploymentId: string) {
    return this.client.post(`/api/v1/projects/${projectId}/deployments/${deploymentId}/rollback`);
  }

  async cancel(projectId: string, deploymentId: string) {
    return this.client.post(`/api/v1/projects/${projectId}/deployments/${deploymentId}/cancel`);
  }

  async getBuildLogs(projectId: string, deploymentId: string) {
    return this.client.get<{ logs: BuildLog[] }>(`/api/v1/projects/${projectId}/deployments/${deploymentId}/logs`);
  }

  /** Streaming build logs — async iterable */
  streamBuildLogs(projectId: string, deploymentId: string) {
    return this.client.streamGet<BuildLog>(
      `/api/v1/projects/${projectId}/deployments/${deploymentId}/logs`,
    );
  }
}
