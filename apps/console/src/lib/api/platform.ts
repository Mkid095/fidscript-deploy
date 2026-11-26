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
  options?: { permissions?: string[]; expiresAt?: string },
): Promise<ApiKey & { key: string }> {
  const response = await api.post<{ apiKey: ApiKey & { key: string } }>(
    '/auth/api-keys',
    {
      name,
      ...(options?.permissions?.length ? { permissions: options.permissions } : {}),
      ...(options?.expiresAt ? { expiresAt: options.expiresAt } : {}),
    },
  );
  return response.apiKey;
}

/** Ends a key. */
export async function revokeApiKey(keyId: string): Promise<void> {
  await api.delete(`/auth/api-keys/${keyId}`);
}

/** Every scope the platform knows — what a key may be restricted to. */
export async function scopeCatalogue(): Promise<string[]> {
  const response = await api.get<{ scopes: string[] }>('/auth/scope-catalogue');
  return response.scopes;
}

/** The registry account's link, if the platform has made one. */
export interface RegistryStatus {
  linked: boolean;
  registryUser?: string;
  linkedAt?: string;
  lastUsedAt?: string | null;
  registryUrl?: string;
}

export async function registryStatus(): Promise<RegistryStatus> {
  return api.get<RegistryStatus>('/auth/registry');
}

/** Link the registry account; the token is returned once. */
export async function registryLink(): Promise<{
  registryUrl: string;
  registryUser: string;
  registryToken: string;
}> {
  return api.post('/auth/registry/link');
}

/** Forget the linked registry account. The remote account itself is kept. */
export async function registryUnlink(): Promise<void> {
  await api.delete('/auth/registry');
}

/** Turn the MCP server on for a key — an agent may reach it with the key. */
export async function mcpEnable(keyId: string): Promise<void> {
  await api.post(`/mcp/keys/${keyId}/enable`);
}

/** Turn the MCP server off for a key. */
export async function mcpDisable(keyId: string): Promise<void> {
  await api.post(`/mcp/keys/${keyId}/disable`);
}

/** Restrict which MCP tools a key may reach. An empty list is all. */
export async function mcpSetScopes(keyId: string, scopes: string[]): Promise<void> {
  await api.patch(`/mcp/keys/${keyId}/scopes`, { scopes });
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

// ── The platform's own backups (disaster recovery) ──────────────────────
// Where the platform's data outlives the machine that made it: an
// off-server destination, the last backup, and whether the last one
// still restores.

export interface BackupDestinationConfig {
  endpoint: string;
  region?: string;
  accessKey: string;
  secretKey: string;
  bucket: string;
  useSsl?: boolean;
}

export interface PlatformBackupStatus {
  destination: {
    kind: 'internal' | 's3';
    description: string;
    configured: boolean;
  };
  retentionDays: number;
  lastBackup: {
    backupId: string;
    createdAt: string;
    tableCounts: Record<string, number> | undefined;
  } | null;
  lastVerify: {
    checkedAt: string;
    ok: boolean;
    backupId: string | null;
    error?: string;
    mismatchCount?: number;
  } | null;
}

/** Where the backups go, the newest one, and whether it still restores. */
export async function getPlatformBackupStatus(): Promise<PlatformBackupStatus> {
  return api.get<PlatformBackupStatus>('/admin/platform-backup');
}

/** Run a backup now. */
export async function runPlatformBackup(): Promise<{
  backupId: string;
  bytesStored: number;
  destination: { kind: string; description: string };
}> {
  return api.post('/admin/platform-backup/run');
}

/** Prove the newest backup restores. */
export async function verifyPlatformRestore(): Promise<{
  ok: boolean;
  backupId: string | null;
  countsVerified: boolean;
  error?: string;
}> {
  return api.post('/admin/platform-backup/verify-restore');
}

/** Probe a destination without saving it. */
export async function testBackupDestination(
  config: BackupDestinationConfig,
): Promise<{ ok: boolean; detail?: string; error?: string }> {
  return api.post('/admin/platform-backup/destination/test', config);
}

/** Save a destination — only once it answered the probe. */
export async function saveBackupDestination(
  config: BackupDestinationConfig,
): Promise<void> {
  await api.post('/admin/platform-backup/destination', config);
}

/** Back to the platform's own MinIO. */
export async function clearBackupDestination(): Promise<void> {
  await api.delete('/admin/platform-backup/destination');
}
