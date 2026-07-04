/**
 * Auth MCP tools — exposes authentication and organization operations to AI agents.
 */
import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import type { FidscriptSDK } from '@fidscript-deploy/sdk';

export const authTools: Tool[] = [
  // ─── Phase 5.1 — Verification ───────────────────────────────────────────────
  {
    name: 'auth_send_verification',
    description: 'Send a verification token to an email address (EMAIL_VERIFY, PASSWORD_RESET, or MAGIC_LINK)',
    inputSchema: {
      type: 'object',
      properties: {
        email: { type: 'string', description: 'Email address' },
        type: { type: 'string', enum: ['EMAIL_VERIFY', 'PASSWORD_RESET', 'MAGIC_LINK'], description: 'Type of token to send' },
      },
      required: ['email', 'type'],
    },
  },
  {
    name: 'auth_verify_email',
    description: 'Confirm an email address using a token from the verification link',
    inputSchema: {
      type: 'object',
      properties: {
        token: { type: 'string', description: 'Token from the verification email link' },
      },
      required: ['token'],
    },
  },
  {
    name: 'auth_reset_password',
    description: 'Reset password using a token from the password-reset email (consumes token, revokes all sessions)',
    inputSchema: {
      type: 'object',
      properties: {
        token: { type: 'string', description: 'Token from the password reset email' },
        newPassword: { type: 'string', description: 'New password (min 8 characters)', minLength: 8 },
      },
      required: ['token', 'newPassword'],
    },
  },
  // ─── Sessions ───────────────────────────────────────────────────────────────
  {
    name: 'auth_list_sessions',
    description: 'List all active sessions for the current user',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'auth_revoke_session',
    description: 'Revoke a specific session by ID',
    inputSchema: {
      type: 'object',
      properties: { sessionId: { type: 'string', description: 'Session ID to revoke' } },
      required: ['sessionId'],
    },
  },
  {
    name: 'auth_revoke_all_sessions',
    description: 'Revoke all active sessions for the current user',
    inputSchema: { type: 'object', properties: {} },
  },
  // ─── Phase 5.3 — Organizations ────────────────────────────────────────────
  {
    name: 'auth_list_organizations',
    description: 'List all organizations the current user belongs to',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'auth_create_organization',
    description: 'Create a new organization (caller becomes OWNER)',
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Organization display name' },
        slug: { type: 'string', description: 'URL-safe unique slug (lowercase, hyphens only)' },
      },
      required: ['name', 'slug'],
    },
  },
  {
    name: 'auth_get_organization',
    description: 'Get details of a specific organization',
    inputSchema: {
      type: 'object',
      properties: { orgId: { type: 'string', description: 'Organization ID' } },
      required: ['orgId'],
    },
  },
  {
    name: 'auth_invite_user',
    description: 'Invite someone to an organization by email with a specific role',
    inputSchema: {
      type: 'object',
      properties: {
        orgId: { type: 'string', description: 'Organization ID' },
        email: { type: 'string', description: 'Email address to invite' },
        roleName: { type: 'string', enum: ['ADMIN', 'DEVELOPER', 'BILLING', 'VIEWER'], description: 'Role to assign' },
      },
      required: ['orgId', 'email', 'roleName'],
    },
  },
  {
    name: 'auth_list_org_members',
    description: 'List all members of an organization',
    inputSchema: {
      type: 'object',
      properties: { orgId: { type: 'string', description: 'Organization ID' } },
      required: ['orgId'],
    },
  },
  {
    name: 'auth_list_org_teams',
    description: 'List all teams in an organization',
    inputSchema: {
      type: 'object',
      properties: { orgId: { type: 'string', description: 'Organization ID' } },
      required: ['orgId'],
    },
  },
  {
    name: 'auth_create_team',
    description: 'Create a new team within an organization',
    inputSchema: {
      type: 'object',
      properties: {
        orgId: { type: 'string', description: 'Organization ID' },
        name: { type: 'string', description: 'Team name' },
        description: { type: 'string', description: 'Team description (optional)' },
      },
      required: ['orgId', 'name'],
    },
  },
  {
    name: 'auth_accept_invitation',
    description: 'Accept an organization invitation using a token',
    inputSchema: {
      type: 'object',
      properties: { token: { type: 'string', description: 'Token from the invitation email' } },
      required: ['token'],
    },
  },
];

export async function handleAuthTool(name: string, args: Record<string, unknown>, sdk: FidscriptSDK): Promise<unknown> {
  switch (name) {
    case 'auth_send_verification':
      return sdk.auth.sendVerification(args['email'] as string, args['type'] as 'EMAIL_VERIFY' | 'PASSWORD_RESET' | 'MAGIC_LINK');
    case 'auth_verify_email':
      return sdk.auth.verifyEmail(args['token'] as string);
    case 'auth_reset_password':
      return sdk.auth.confirmPasswordReset(args['token'] as string, args['newPassword'] as string);
    case 'auth_list_sessions':
      return sdk.auth.sessions();
    case 'auth_revoke_session':
      return sdk.auth.revokeSession(args['sessionId'] as string);
    case 'auth_revoke_all_sessions':
      return sdk.auth.revokeAllSessions();
    case 'auth_list_organizations':
      return sdk.auth.organizations();
    case 'auth_create_organization':
      return sdk.auth.createOrganization(args['name'] as string, args['slug'] as string);
    case 'auth_get_organization':
      return sdk.auth.getOrganization(args['orgId'] as string);
    case 'auth_invite_user':
      return sdk.auth.inviteOrgMember(args['orgId'] as string, args['email'] as string, args['roleName'] as string);
    case 'auth_list_org_members':
      return sdk.auth.orgMembers(args['orgId'] as string);
    case 'auth_list_org_teams':
      return sdk.auth.teams(args['orgId'] as string);
    case 'auth_create_team':
      return sdk.auth.createTeam(args['orgId'] as string, args['name'] as string, args['description'] as string | undefined);
    case 'auth_accept_invitation':
      return sdk.auth.acceptInvitation(args['token'] as string);
    default:
      throw new Error(`Unknown auth tool: ${name}`);
  }
}
