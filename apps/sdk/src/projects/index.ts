import { AxiosInstance } from 'axios';
import { Project } from '../index.js';

export class ProjectsModule {
  private client: AxiosInstance;
  private projectId?: string;

  constructor(client: AxiosInstance) {
    this.client = client;
  }

  setProject(projectId: string) {
    this.projectId = projectId;
  }

  async list() {
    const response = await this.client.get('/projects');
    return response.data.projects as Project[];
  }

  async get(id: string) {
    const response = await this.client.get(`/projects/${id}`);
    return response.data as Project;
  }

  async create(data: { name: string; type?: string; description?: string }) {
    const response = await this.client.post('/projects', data);
    return response.data as Project;
  }

  async update(id: string, data: Partial<Project>) {
    const response = await this.client.patch(`/projects/${id}`, data);
    return response.data as Project;
  }

  async delete(id: string) {
    const response = await this.client.delete(`/projects/${id}`);
    return response.data;
  }

  async getMembers(projectId: string) {
    const response = await this.client.get(`/projects/${projectId}/members`);
    return response.data.members;
  }

  async addMember(projectId: string, email: string, role: string) {
    const response = await this.client.post(`/projects/${projectId}/members`, { email, role });
    return response.data;
  }

  async removeMember(projectId: string, userId: string) {
    const response = await this.client.delete(`/projects/${projectId}/members/${userId}`);
    return response.data;
  }

  async getEnvVars(projectId: string) {
    const response = await this.client.get(`/projects/${projectId}/env`);
    return response.data.envVars;
  }

  async setEnvVars(projectId: string, envVars: Record<string, string>) {
    const response = await this.client.put(`/projects/${projectId}/env`, { envVars });
    return response.data;
  }
}