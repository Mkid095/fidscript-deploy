import { AxiosInstance } from 'axios';
import { Deployment } from '../index.js';

export class DeploymentsModule {
  private client: AxiosInstance;
  private projectId?: string;

  constructor(client: AxiosInstance) {
    this.client = client;
  }

  setProject(projectId: string) {
    this.projectId = projectId;
  }

  async list(projectId: string) {
    const response = await this.client.get(`/projects/${projectId}/deployments`);
    return response.data.deployments as Deployment[];
  }

  async get(projectId: string, deploymentId: string) {
    const response = await this.client.get(`/projects/${projectId}/deployments/${deploymentId}`);
    return response.data as Deployment;
  }

  async create(projectId: string, data: { sourceRepo?: string; sourceBranch?: string }) {
    const response = await this.client.post(`/projects/${projectId}/deployments`, data);
    return response.data as Deployment;
  }

  async rollback(projectId: string, deploymentId: string) {
    const response = await this.client.post(`/projects/${projectId}/deployments/${deploymentId}/rollback`);
    return response.data;
  }

  async getBuildConfig(projectId: string) {
    const response = await this.client.get(`/projects/${projectId}/deployments/config`);
    return response.data;
  }

  async updateBuildConfig(projectId: string, config: any) {
    const response = await this.client.patch(`/projects/${projectId}/deployments/config`, config);
    return response.data;
  }

  async cancel(projectId: string, deploymentId: string) {
    const response = await this.client.post(`/projects/${projectId}/deployments/${deploymentId}/cancel`);
    return response.data;
  }
}