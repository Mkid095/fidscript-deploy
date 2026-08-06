import { FidscriptClient } from '../client';

export interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  mfaEnabled: boolean;
  mustChangePassword: boolean;
  emailVerifiedAt: string | null;
  preferredAuthMethod: 'PASSWORD' | 'MAGIC_CODE';
  createdAt: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user: User;
}

export interface MagicCodeSendResponse {
  sent: boolean;
}

export interface MagicCodeVerifyResponse extends AuthResponse {}

export interface AuthMethodResponse {
  authMethod: 'PASSWORD' | 'MAGIC_CODE';
}

export interface SessionInfo {
  id: string;
  expiresAt: string;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
}

export interface ApiKeyInfo {
  id: string;
  name: string;
  keyPreview: string;
  scopes: string[];
  lastUsedAt: string | null;
  createdAt: string;
}

// ─── Phase 5.1 — Verification ───────────────────────────────────────────────────

export interface SendVerificationResponse {
  sent: boolean;
}

export interface VerifyEmailResponse {
  verified: boolean;
  email: string;
}

export interface ConfirmPasswordResetResponse {
  success: boolean;
}

// ─── Phase 5.3 — Organizations ────────────────────────────────────────────────

export interface Organization {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  plan: string;
  createdAt: string;
  myRole: string;
  myPermissions: string[];
}

export interface OrgRole {
  id: string;
  name: string;
  permissions: string[];
}

export interface OrgMember {
  id: string;
  user: { id: string; email: string; name: string | null; avatarUrl: string | null };
  role: OrgRole;
  createdAt: string;
}

export interface Team {
  id: string;
  name: string;
  description: string | null;
  createdAt: string;
  members: { userId: string; role: string; user: { id: string; email: string; name: string | null } }[];
}

export interface Invitation {
  id: string;
  email: string;
  expiresAt: string;
  role: { name: string };
  createdAt: string;
}

export class AuthModule {
  constructor(private client: FidscriptClient) {}

  // ─── Core auth ───────────────────────────────────────────────────────────────

  async register(
    email: string,
    password: string | null,
    name: string,
    authMethod: 'PASSWORD' | 'MAGIC_CODE',
    inviteKeyword?: string,
  ) {
    return this.client.post<AuthResponse>('/api/v1/auth/register', {
      email,
      password,
      name,
      authMethod,
      inviteKeyword,
    });
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
    return this.client.post<AuthResponse>('/api/v1/auth/change-password', { currentPassword, newPassword });
  }

  // ─── Magic code ───────────────────────────────────────────────────────────────

  async sendMagicCode(email: string) {
    return this.client.post<MagicCodeSendResponse>('/api/v1/auth/magic-code', { email });
  }

  async verifyMagicCode(email: string, code: string) {
    return this.client.post<MagicCodeVerifyResponse>('/api/v1/auth/verify-magic-code', { email, code });
  }

  // ─── Phase 5.1 — Verification flows ─────────────────────────────────────────

  async sendVerification(email: string, type: 'EMAIL_VERIFY' | 'PASSWORD_RESET' | 'MAGIC_LINK') {
    return this.client.post<SendVerificationResponse>('/api/v1/auth/send-verification', { email, type });
  }

  async verifyEmail(token: string) {
    return this.client.post<VerifyEmailResponse>('/api/v1/auth/verify-email', { token });
  }

  async confirmPasswordReset(token: string, newPassword: string) {
    return this.client.post<ConfirmPasswordResetResponse>('/api/v1/auth/password-reset', { token, newPassword });
  }

  async confirmMagicLink(token: string): Promise<AuthResponse> {
    return this.client.post<AuthResponse>('/api/v1/auth/magic-link/verify', { token });
  }

  // ─── Sessions ────────────────────────────────────────────────────────────────

  async sessions(): Promise<{ sessions: SessionInfo[] }> {
    return this.client.get<{ sessions: SessionInfo[] }>('/api/v1/auth/sessions');
  }

  async revokeSession(sessionId: string) {
    return this.client.delete(`/api/v1/auth/sessions/${sessionId}`);
  }

  async revokeAllSessions() {
    return this.client.delete('/api/v1/auth/sessions');
  }

  // ─── API keys ───────────────────────────────────────────────────────────────

  async apiKeys(): Promise<{ apiKeys: ApiKeyInfo[] }> {
    return this.client.get<{ apiKeys: ApiKeyInfo[] }>('/api/v1/auth/api-keys');
  }

  async createApiKey(name: string, scopes?: string[]): Promise<ApiKeyInfo & { key: string }> {
    return this.client.post(`/api/v1/auth/api-keys`, { name, scopes });
  }

  async revokeApiKey(keyId: string) {
    return this.client.delete(`/api/v1/auth/api-keys/${keyId}`);
  }

  // ─── Phase 5.3 — Organizations ──────────────────────────────────────────────

  async organizations(): Promise<Organization[]> {
    return this.client.get<Organization[]>('/api/v1/organizations');
  }

  async getOrganization(orgId: string) {
    return this.client.get(`/api/v1/organizations/${orgId}`);
  }

  async createOrganization(name: string, slug: string) {
    return this.client.post<Organization>('/api/v1/organizations', { name, slug });
  }

  async updateOrganization(orgId: string, data: { name?: string; logoUrl?: string }) {
    return this.client.patch(`/api/v1/organizations/${orgId}`, data);
  }

  async deleteOrganization(orgId: string) {
    return this.client.delete<{ deleted: boolean }>(`/api/v1/organizations/${orgId}`);
  }

  async orgRoles(orgId: string): Promise<OrgRole[]> {
    return this.client.get<OrgRole[]>(`/api/v1/organizations/${orgId}/roles`);
  }

  async orgMembers(orgId: string): Promise<OrgMember[]> {
    return this.client.get<OrgMember[]>(`/api/v1/organizations/${orgId}/members`);
  }

  async inviteOrgMember(orgId: string, email: string, roleName: string) {
    return this.client.post(`/api/v1/organizations/${orgId}/invitations`, { email, roleName });
  }

  async listOrgInvitations(orgId: string): Promise<Invitation[]> {
    return this.client.get<Invitation[]>(`/api/v1/organizations/${orgId}/invitations`);
  }

  async revokeOrgInvitation(orgId: string, invitationId: string) {
    return this.client.delete(`/api/v1/organizations/${orgId}/invitations/${invitationId}`);
  }

  async acceptInvitation(token: string) {
    return this.client.post<{ success: boolean; organizationId: string }>('/api/v1/invitations/accept', { token });
  }

  // ─── Teams ─────────────────────────────────────────────────────────────────

  async teams(orgId: string): Promise<Team[]> {
    return this.client.get<Team[]>(`/api/v1/organizations/${orgId}/teams`);
  }

  async getTeam(orgId: string, teamId: string) {
    return this.client.get<Team>(`/api/v1/organizations/${orgId}/teams/${teamId}`);
  }

  async createTeam(orgId: string, name: string, description?: string) {
    return this.client.post<Team>(`/api/v1/organizations/${orgId}/teams`, { name, description });
  }

  async updateTeam(orgId: string, teamId: string, data: { name?: string; description?: string }) {
    return this.client.patch(`/api/v1/organizations/${orgId}/teams/${teamId}`, data);
  }

  async deleteTeam(orgId: string, teamId: string) {
    return this.client.delete<{ deleted: boolean }>(`/api/v1/organizations/${orgId}/teams/${teamId}`);
  }

  async addTeamMember(orgId: string, teamId: string, userId: string, role?: 'LEAD' | 'MEMBER' | 'VIEWER') {
    return this.client.post(`/api/v1/organizations/${orgId}/teams/${teamId}/members`, { userId, role });
  }

  async removeTeamMember(orgId: string, teamId: string, userId: string) {
    return this.client.delete(`/api/v1/organizations/${orgId}/teams/${teamId}/members/${userId}`);
  }
}
