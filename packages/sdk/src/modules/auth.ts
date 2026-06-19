import { FidscriptClient } from '../client';

export interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  mfaEnabled: boolean;
  createdAt: string;
}

export interface LoginResult {
  user: User;
  token: string;
}

export class AuthModule {
  constructor(private client: FidscriptClient) {}

  async register(email: string, password: string, name?: string) {
    return this.client.post<{ user: User }>('/api/v1/auth/register', { email, password, name });
  }

  async login(email: string, password: string) {
    return this.client.post<LoginResult>('/api/v1/auth/login', { email, password });
  }

  async logout() {
    return this.client.post('/api/v1/auth/logout');
  }

  async magicLink(email: string) {
    return this.client.post('/api/v1/auth/magic-link', { email });
  }

  async verifyMagicLink(token: string) {
    return this.client.post<LoginResult>('/api/v1/auth/verify-magic-link', { token });
  }

  async getSession() {
    return this.client.get<{ user: User }>('/api/v1/auth/session');
  }

  async refreshToken() {
    return this.client.post<{ token: string }>('/api/v1/auth/refresh');
  }
}
