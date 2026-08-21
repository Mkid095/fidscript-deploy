/**
 * Auth sessions + API keys — list/revoke active sessions and manage API keys.
 * Split out of auth.ts for ANPAS 150-line limit.
 */

import type { AuthSessionsHost } from './auth-host';
import type { SessionInfo, ApiKeyInfo } from './auth-types';

export function applyAuthSessionsMethods(host: AuthSessionsHost): void {
  const client = host.client;

  host.sessions = () =>
    client.get<{ sessions: SessionInfo[] }>('/api/v1/auth/sessions');

  host.revokeSession = (sessionId) =>
    client.delete(`/api/v1/auth/sessions/${sessionId}`);

  host.revokeAllSessions = () =>
    client.delete('/api/v1/auth/sessions');

  host.apiKeys = () =>
    client.get<{ apiKeys: ApiKeyInfo[] }>('/api/v1/auth/api-keys');

  host.createApiKey = (name, scopes) =>
    client.post<ApiKeyInfo & { key: string }>(`/api/v1/auth/api-keys`,
      scopes !== undefined ? { name, scopes } : { name });

  host.revokeApiKey = (keyId) =>
    client.delete(`/api/v1/auth/api-keys/${keyId}`);
}
