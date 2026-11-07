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
  /** When the first-time journey was finished — null when it has not been. */
  onboardedAt: string | null;
  preferredAuthMethod: 'PASSWORD' | 'MAGIC_CODE';
  createdAt: string;
  /** The credential types the user has — PASSWORD, MAGIC_CODE, PASSKEY. */
  credentials?: Array<{ type: 'PASSWORD' | 'MAGIC_CODE' | 'PASSKEY' }>;
}

export interface AuthResponse {
  accessToken: string;
  /** Present only when the account has a second factor. */
  mfaRequired?: false;
  refreshToken: string;
  expiresIn: number;
  user: User;
}

/**
 * What a sign-in can answer with.
 *
 * An account with MFA on does not get tokens at the password step: it gets
 * a short-lived challenge, and the second factor is what turns it into a
 * session. The type used to claim `AuthResponse` — so a client asked for
 * tokens, received none, and stored `undefined` as if they were real.
 */
export interface MfaRequiredResponse {
  mfaRequired: true;
  mfaToken: string;
}

export type LoginResponse = AuthResponse | MfaRequiredResponse;

/** The secret and the otpauth URL for an authenticator app. */
export interface MfaSetupResponse {
  secret: string;
  otpauthUrl: string;
}

/** Whether MFA is on, and how many recovery codes are left. */
export interface MfaStatusResponse {
  enabled: boolean;
  recoveryCodesRemaining: number;
}

/** A fresh set of recovery codes — shown once. */
export interface MfaRecoveryCodesResponse {
  codes: string[];
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
