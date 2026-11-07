/**
 * Databases — backup methods (legacy compatibility + scheduling).
 * Attached via `applyBackupsMethods`.
 */

import type { DatabasesHost } from './databases-host';

export function applyBackupsMethods(host: DatabasesHost): void {
  const client = host.client;

  // ── Legacy compatibility (will be removed once dashboard migrates) ────────

  host.backup = (projectId, databaseId) =>
    client.post(`/api/v1/projects/${projectId}/databases/${databaseId}/backups`, {});

  host.listBackups = async (projectId, databaseId) => {
    const res = await client.get<{ backups: unknown[] }>(
      `/api/v1/projects/${projectId}/databases/${databaseId}/backups`,
    );
    return res.backups ?? [];
  };

  host.restore = (projectId, databaseId, backupId) =>
    client.post(`/api/v1/projects/${projectId}/databases/${databaseId}/backups/${backupId}/restore`, {});

  host.rotatePassword = <T = unknown>(projectId: string, databaseId: string) =>
    client.post<T>(`/api/v1/projects/${projectId}/databases/${databaseId}/credentials/rotate`, {});

  host.getConnection = (projectId, databaseId, poolOnly = false) => {
    const params = poolOnly ? '?poolOnly=true' : '';
    return client.get(
      `/api/v1/projects/${projectId}/databases/${databaseId}/connection${params}`,
    );
  };

  host.updateSsl = (projectId, databaseId, ssl) =>
    client.post(`/api/v1/projects/${projectId}/databases/${databaseId}/credentials/rotate`, { ssl });

}