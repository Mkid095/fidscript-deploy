/**
 * Auth host interfaces — union of method surfaces attached via mixins.
 * Split out of auth.ts for ANPAS 150-line limit.
 */

import type { FidscriptClient } from '../client';
import type {
  User, AuthResponse, MagicCodeSendResponse, MagicCodeVerifyResponse,
  AuthMethodResponse, SessionInfo, ApiKeyInfo, SendVerificationResponse,
  VerifyEmailResponse, ConfirmPasswordResetResponse, Organization, OrgRole,
  OrgMember, Team, Invitation,
} from './auth-types';

export interface AuthCoreHost {
  readonly client: FidscriptClient;
  register(
    email: string,
    password: string | null,
    name: string,
    authMethod: 'PASSWORD' | 'MAGIC_CODE',
    inviteKeyword?: string,
  ): Promise<AuthResponse>;
  login(email: string, password: string): Promise<AuthResponse>;
  lookupAuthMethod(email: string): Promise<AuthMethodResponse>;
  logout(): Promise<unknown>;
  me(): Promise<User>;
  refreshToken(refreshToken: string): Promise<AuthResponse>;
  changePassword(currentPassword: string, newPassword: string): Promise<AuthResponse>;
  sendMagicCode(email: string): Promise<MagicCodeSendResponse>;
  verifyMagicCode(email: string, code: string): Promise<MagicCodeVerifyResponse>;
  sendVerification(email: string, type: 'EMAIL_VERIFY' | 'PASSWORD_RESET' | 'MAGIC_LINK'): Promise<SendVerificationResponse>;
  verifyEmail(token: string): Promise<VerifyEmailResponse>;
  confirmPasswordReset(token: string, newPassword: string): Promise<ConfirmPasswordResetResponse>;
  confirmMagicLink(token: string): Promise<AuthResponse>;
}

export interface AuthSessionsHost {
  readonly client: FidscriptClient;
  sessions(): Promise<{ sessions: SessionInfo[] }>;
  revokeSession(sessionId: string): Promise<unknown>;
  revokeAllSessions(): Promise<unknown>;
  apiKeys(): Promise<{ apiKeys: ApiKeyInfo[] }>;
  createApiKey(name: string, scopes?: string[]): Promise<ApiKeyInfo & { key: string }>;
  revokeApiKey(keyId: string): Promise<unknown>;
}

export interface AuthOrgsHost {
  readonly client: FidscriptClient;
  organizations(): Promise<Organization[]>;
  getOrganization(orgId: string): Promise<unknown>;
  createOrganization(name: string, slug: string): Promise<Organization>;
  updateOrganization(orgId: string, data: { name?: string; logoUrl?: string }): Promise<unknown>;
  deleteOrganization(orgId: string): Promise<{ deleted: boolean }>;
  orgRoles(orgId: string): Promise<OrgRole[]>;
  orgMembers(orgId: string): Promise<OrgMember[]>;
  inviteOrgMember(orgId: string, email: string, roleName: string): Promise<unknown>;
  listOrgInvitations(orgId: string): Promise<Invitation[]>;
  revokeOrgInvitation(orgId: string, invitationId: string): Promise<unknown>;
  acceptInvitation(token: string): Promise<{ success: boolean; organizationId: string }>;
}

export interface AuthTeamsHost {
  readonly client: FidscriptClient;
  teams(orgId: string): Promise<Team[]>;
  getTeam(orgId: string, teamId: string): Promise<Team>;
  createTeam(orgId: string, name: string, description?: string): Promise<Team>;
  updateTeam(orgId: string, teamId: string, data: { name?: string; description?: string }): Promise<unknown>;
  deleteTeam(orgId: string, teamId: string): Promise<{ deleted: boolean }>;
  addTeamMember(orgId: string, teamId: string, userId: string, role?: 'LEAD' | 'MEMBER' | 'VIEWER'): Promise<unknown>;
  removeTeamMember(orgId: string, teamId: string, userId: string): Promise<unknown>;
}
