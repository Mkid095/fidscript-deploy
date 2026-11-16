import 'server-only';

import { serverApi as api } from './server';
import type {
  ApiKey,
  Application,
  PlatformOverview,
  Session,
  User,
} from './types';

/**
 * The platform's own surface: the operator's account, the applications that
 * are installed, the keys, and the overview that answers "what is happening".
 */

/** The signed-in person. Throws when there is no session. */
export async function currentUser(): Promise<User> {
  const response = await api.get<{ user: User }>('/auth/me');
  return response.user;
}

/**
 * The signed-in person, or null.
 *
 * For the pages that answer "are you in?" without caring when the answer is
 * no — the front door, chiefly.
 */
export async function sessionUser(): Promise<User | null> {
  try {
    return await currentUser();
  } catch {
    return null;
  }
}

/** The platform's domain — the anchor every service address hangs from. */
export async function getPlatformDomain(): Promise<string | null> {
  const response = await api
    .get<{ platformDomain?: string }>('/installation/status')
    .catch(() => null);
  return response?.platformDomain ?? null;
}

/** The overview — the caller's own projects, deployments, alerts and activity. */
export async function platformOverview(): Promise<PlatformOverview> {
  return api.get<PlatformOverview>('/overview');
}

/** Every application the platform can have, and which are installed. */
export async function applications(): Promise<Application[]> {
  const response = await api.get<{ applications: Application[] }>(
    '/applications',
  );
  return response.applications;
}

/** The sessions this account has open. */
export async function sessions(): Promise<Session[]> {
  const response = await api.get<{ sessions: Session[] }>('/auth/sessions');
  return response.sessions;
}

/** Ends one session. */
export async function revokeSession(sessionId: string): Promise<void> {
  await api.delete(`/auth/sessions/${sessionId}`);
}

/** Ends every session. */
export async function revokeAllSessions(): Promise<void> {
  await api.delete('/auth/sessions');
}

/** The account's API keys. */
export async function apiKeys(): Promise<ApiKey[]> {
  const response = await api.get<{ apiKeys: ApiKey[] }>('/auth/api-keys');
  return response.apiKeys;
}

/** Mints a key. The key itself is shown once. */
export async function createApiKey(
  name: string,
): Promise<ApiKey & { key: string }> {
  const response = await api.post<{ apiKey: ApiKey & { key: string } }>(
    '/auth/api-keys',
    { name },
  );
  return response.apiKey;
}

/** Ends a key. */
export async function revokeApiKey(keyId: string): Promise<void> {
  await api.delete(`/auth/api-keys/${keyId}`);
}

/** The person's name. */
export async function updateProfile(name: string): Promise<User> {
  const response = await api.patch<{ user: User }>('/auth/me', { name });
  return response.user;
}

/**
 * The first-time journey is finished.
 *
 * The flag is what lets the console **offer** the journey rather than force
 * it: an account that has finished it — or that already has projects — is
 * never made to go through it again.
 */
export async function completeOnboarding(): Promise<void> {
  await api.post('/auth/onboarding/complete');
}

/** Whether MFA is on, and how many recovery codes are left. */
export async function mfaStatus(): Promise<{
  enabled: boolean;
  recoveryCodesRemaining: number;
}> {
  return api.get<{ enabled: boolean; recoveryCodesRemaining: number }>(
    '/auth/mfa/status',
  );
}

// ── The applications' credentials (P5.4) ────────────────────────────────
// "One email, one password" is a decision the operator makes. These are the
// reads and the levers behind that decision.

export interface ApplicationCredential {
  id: string;
  label: string;
  account: string | null;
  authType: 'password' | 'magic-code';
  passwordSource: 'platform' | 'own' | 'machine' | 'none';
  canApply: boolean;
  consoleUrl: string | null;
  available: boolean;
  note: string | null;
}

/** The account each application answers with, as it is configured now. */
export async function getPlatformCredentials(): Promise<{
  platformEmail: string | null;
  applications: ApplicationCredential[];
}> {
  return api.get<{
    platformEmail: string | null;
    applications: ApplicationCredential[];
  }>('/admin/platform-credentials');
}

/** Does that password open each application? Asked live. */
export async function verifyPlatformCredentials(
  email: string,
  password: string,
): Promise<{
  results: Array<{ id: string; opens: boolean | null; detail?: string }>;
}> {
  return api.post('/admin/platform-credentials/verify', { email, password });
}

/** Push the platform's identity onto the applications that take it. */
export async function applyPlatformCredentials(
  email: string,
  password: string,
): Promise<{
  results: Array<{ id: string; applied: boolean | 'manual'; detail?: string }>;
}> {
  return api.post('/admin/platform-credentials/apply', { email, password });
}
