import { FidscriptClient } from '../client';

export interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  mfaEnabled: boolean;
  mustChangePassword: boolean;
  createdAt: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: User;
}

export interface MagicCodeSendResponse {
  sent: boolean;
}

export interface MagicCodeVerifyResponse {
  accessToken: string;
  refreshToken: string;
  user: User;
}

export class AuthModule {
  constructor(private client: FidscriptClient) {}

  async register(email: string, password: string, name?: string) {
    return this.client.post<AuthResponse>('/api/v1/auth/register', { email, password, name });
  }

  async login(email: string, password: string) {
    return this.client.post<AuthResponse>('/api/v1/auth/login', { email, password });
  }

  async logout() {
    return this.client.post('/api/v1/auth/logout');
  }

  async me(): Promise<User> {
    return this.client.get<{ user: User }>('/api/v1/auth/me').then(r => r.user);
  }

  async refreshToken(refreshToken: string) {
    return this.client.post<AuthResponse>('/api/v1/auth/refresh', { refreshToken });
  }

  async changePassword(currentPassword: string, newPassword: string) {
    return this.client.post<AuthResponse>('/api/v1/auth/change-password', {
      currentPassword,
      newPassword,
    });
  }

  async sendMagicCode(email: string) {
    return this.client.post<MagicCodeSendResponse>('/api/v1/auth/magic-code', { email });
  }

  async verifyMagicCode(email: string, code: string) {
    return this.client.post<MagicCodeVerifyResponse>('/api/v1/auth/verify-magic-code', {
      email,
      code,
    });
  }
}
