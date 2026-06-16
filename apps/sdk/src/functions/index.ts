import { AxiosInstance } from 'axios';

export class FunctionsModule {
  private client: AxiosInstance;
  private projectId?: string;

  constructor(client: AxiosInstance) {
    this.client = client;
  }

  setProject(projectId: string) {
    this.projectId = projectId;
  }

  async list(projectId: string) {
    const response = await this.client.get(`/projects/${projectId}/functions`);
    return response.data.functions;
  }

  async get(projectId: string, functionId: string) {
    const response = await this.client.get(`/projects/${projectId}/functions/${functionId}`);
    return response.data;
  }

  async create(projectId: string, data: { name: string; runtime: string; memoryMb?: number; timeoutSeconds?: number }) {
    const response = await this.client.post(`/projects/${projectId}/functions`, data);
    return response.data;
  }

  async deploy(projectId: string, functionId: string, code: string, version?: string) {
    const response = await this.client.post(`/projects/${projectId}/functions/${functionId}/deploy`, { code, version });
    return response.data;
  }

  async invoke(projectId: string, functionId: string, payload?: any) {
    const response = await this.client.post(`/projects/${projectId}/functions/${functionId}/invoke`, { payload });
    return response.data;
  }

  async getLogs(projectId: string, functionId: string, limit = 50) {
    const response = await this.client.get(`/projects/${projectId}/functions/${functionId}/logs`, { params: { limit } });
    return response.data.logs;
  }

  async delete(projectId: string, functionId: string) {
    const response = await this.client.delete(`/projects/${projectId}/functions/${functionId}`);
    return response.data;
  }
}