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

export class AuthModule {
  readonly client: FidscriptClient;

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
