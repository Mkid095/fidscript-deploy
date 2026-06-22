import { FidscriptClient } from '../client';

export interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  mfaEnabled: boolean;
  mustChangePassword: boolean;
  preferredAuthMethod: 'PASSWORD' | 'MAGIC_CODE';
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

export interface AuthMethodResponse {
  authMethod: 'PASSWORD' | 'MAGIC_CODE';
}

export class AuthModule {
  constructor(private client: FidscriptClient) {}

  async register(email: string, password: string | null, name: string, authMethod: 'PASSWORD' | 'MAGIC_CODE') {
    return this.client.post<AuthResponse>('/api/v1/auth/register', { email, password, name, authMethod });
  }

  async login(email: string, password: string) {
    return this.client.post<AuthResponse>('/api/v1/auth/login', { email, password });
  }

  async lookupAuthMethod(email: string) {
    return this.client.get<AuthMethodResponse>(`/api/v1/auth/auth-method/${encodeURIComponent(email)}`);
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
