/**
 * Auth type definitions — split out of auth.ts for ANPAS 150-line limit.
 */

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

// ─── Phase 5.1 — Verification ────────────────────────────────────────────

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

// ─── Phase 5.3 — Organizations ───────────────────────────────────────────

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
