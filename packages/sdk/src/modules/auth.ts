/**
 * AuthModule — platform auth: registration, login, sessions, orgs, teams.
 *
 * Sub-modules (each ≤150 lines):
 * - auth-types.ts       — type interfaces (User, AuthResponse, Org*, etc.)
 * - auth-host.ts        — AuthCoreHost / AuthSessionsHost / AuthOrgsHost / AuthTeamsHost
 * - auth-core.ts        — register/login/magic/verification methods
 * - auth-sessions.ts    — sessions + API keys
 * - auth-orgs.ts        — organizations + roles + members + invitations
 * - auth-teams.ts       — teams + team members
 *
 * Methods are attached to AuthModule via `apply*Methods` mixin functions in the
 * constructor. The host interfaces declare every method so consumers see a stable
 * surface.
 */

import { FidscriptClient } from '../client';
import { applyAuthCoreMethods } from './auth-core';
import { applyAuthSessionsMethods } from './auth-sessions';
import { applyAuthOrgsMethods } from './auth-orgs';
import { applyAuthTeamsMethods } from './auth-teams';
import type { AuthCoreHost, AuthSessionsHost, AuthOrgsHost, AuthTeamsHost } from './auth-host';

interface AuthModuleHost extends AuthCoreHost, AuthSessionsHost, AuthOrgsHost, AuthTeamsHost {}

export class AuthModule implements AuthCoreHost, AuthSessionsHost, AuthOrgsHost, AuthTeamsHost {
  readonly client: FidscriptClient;

  // AuthCoreHost
  register!: (email: string, password: string | null, name: string, authMethod: 'PASSWORD' | 'MAGIC_CODE', inviteKeyword?: string) => Promise<import('./auth-types').AuthResponse>;
  login!: (email: string, password: string) => Promise<import('./auth-types').AuthResponse>;
  lookupAuthMethod!: (email: string) => Promise<import('./auth-types').AuthMethodResponse>;
  logout!: () => Promise<unknown>;
  me!: () => Promise<import('./auth-types').User>;
  refreshToken!: (refreshToken: string) => Promise<import('./auth-types').AuthResponse>;
  changePassword!: (currentPassword: string, newPassword: string) => Promise<import('./auth-types').AuthResponse>;
  sendMagicCode!: (email: string) => Promise<import('./auth-types').MagicCodeSendResponse>;
  verifyMagicCode!: (email: string, code: string) => Promise<import('./auth-types').MagicCodeVerifyResponse>;
  sendVerification!: (email: string, type: 'EMAIL_VERIFY' | 'PASSWORD_RESET' | 'MAGIC_LINK') => Promise<import('./auth-types').SendVerificationResponse>;
  verifyEmail!: (token: string) => Promise<import('./auth-types').VerifyEmailResponse>;
  confirmPasswordReset!: (token: string, newPassword: string) => Promise<import('./auth-types').ConfirmPasswordResetResponse>;
  confirmMagicLink!: (token: string) => Promise<import('./auth-types').AuthResponse>;

  // AuthSessionsHost
  sessions!: () => Promise<{ sessions: import('./auth-types').SessionInfo[] }>;
  revokeSession!: (sessionId: string) => Promise<unknown>;
  revokeAllSessions!: () => Promise<unknown>;
  apiKeys!: () => Promise<{ apiKeys: import('./auth-types').ApiKeyInfo[] }>;
  createApiKey!: (name: string, scopes?: string[]) => Promise<import('./auth-types').ApiKeyInfo & { key: string }>;
  revokeApiKey!: (keyId: string) => Promise<unknown>;

  // AuthOrgsHost
  organizations!: () => Promise<import('./auth-types').Organization[]>;
  getOrganization!: (orgId: string) => Promise<unknown>;
  createOrganization!: (name: string, slug: string) => Promise<import('./auth-types').Organization>;
  updateOrganization!: (orgId: string, data: { name?: string; logoUrl?: string }) => Promise<unknown>;
  deleteOrganization!: (orgId: string) => Promise<{ deleted: boolean }>;
  orgRoles!: (orgId: string) => Promise<import('./auth-types').OrgRole[]>;
  orgMembers!: (orgId: string) => Promise<import('./auth-types').OrgMember[]>;
  inviteOrgMember!: (orgId: string, email: string, roleName: string) => Promise<unknown>;
  listOrgInvitations!: (orgId: string) => Promise<import('./auth-types').Invitation[]>;
  revokeOrgInvitation!: (orgId: string, invitationId: string) => Promise<unknown>;
  acceptInvitation!: (token: string) => Promise<{ success: boolean; organizationId: string }>;

  // AuthTeamsHost
  teams!: (orgId: string) => Promise<import('./auth-types').Team[]>;
  getTeam!: (orgId: string, teamId: string) => Promise<import('./auth-types').Team>;
  createTeam!: (orgId: string, name: string, description?: string) => Promise<import('./auth-types').Team>;
  updateTeam!: (orgId: string, teamId: string, data: { name?: string; description?: string }) => Promise<unknown>;
  deleteTeam!: (orgId: string, teamId: string) => Promise<{ deleted: boolean }>;
  addTeamMember!: (orgId: string, teamId: string, userId: string, role?: 'LEAD' | 'MEMBER' | 'VIEWER') => Promise<unknown>;
  removeTeamMember!: (orgId: string, teamId: string, userId: string) => Promise<unknown>;

  constructor(client: FidscriptClient) {
    this.client = client;
    const host = this as unknown as AuthModuleHost;
    applyAuthCoreMethods(host as unknown as AuthCoreHost);
    applyAuthSessionsMethods(host as unknown as AuthSessionsHost);
    applyAuthOrgsMethods(host as unknown as AuthOrgsHost);
    applyAuthTeamsMethods(host as unknown as AuthTeamsHost);
  }
}

// Re-export all types for backwards compatibility
export type {
  User,
  AuthResponse,
  MagicCodeSendResponse,
  MagicCodeVerifyResponse,
  AuthMethodResponse,
  SessionInfo,
  ApiKeyInfo,
  SendVerificationResponse,
  VerifyEmailResponse,
  ConfirmPasswordResetResponse,
  Organization,
  OrgRole,
  OrgMember,
  Team,
  Invitation,
} from './auth-types';
