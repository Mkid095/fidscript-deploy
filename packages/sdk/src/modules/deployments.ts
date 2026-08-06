import { FidscriptClient } from '../client';
import {
  Deployment,
  DeploymentListResult,
  BuildConfig,
  BuildPlan,
  CreateDeploymentInput,
  DetectInput,
} from './deployments-types';

export type {
  Deployment,
  DeploymentListResult,
  BuildConfig,
  BuildPlan,
  CreateDeploymentInput,
  DetectInput,
};

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