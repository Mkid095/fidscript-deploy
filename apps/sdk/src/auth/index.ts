import { AxiosInstance } from 'axios';

export class AuthModule {
  private client: AxiosInstance;
  private projectId?: string;

  constructor(client: AxiosInstance, projectId?: string) {
    this.client = client;
    this.projectId = projectId;
  }

  setProject(projectId: string) {
    this.projectId = projectId;
  }

  async register(email: string, password: string, name?: string) {
    const response = await this.client.post('/auth/register', { email, password, name });
    return response.data;
  }

  async login(email: string, password: string) {
    const response = await this.client.post('/auth/login', { email, password });
    return response.data;
  }

  async logout() {
    const response = await this.client.post('/auth/logout');
    return response.data;
  }

  async magicLink(email: string) {
    const response = await this.client.post('/auth/magic-link', { email });
    return response.data;
  }

  async verifyMagicLink(token: string) {
    const response = await this.client.post('/auth/verify-magic-link', { token });
    return response.data;
  }

  async getSession() {
    const response = await this.client.get('/auth/session');
    return response.data;
  }
}