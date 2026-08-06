/**
 * Databases — backup methods (legacy compatibility + scheduling).
 * Attached via `applyBackupsMethods`.
 */

import type { DatabasesHost } from './databases-host';

export function applyBackupsMethods(host: DatabasesHost): void {
  const client = host.client;

  // ── Legacy compatibility (will be removed once dashboard migrates) ────────

  host.backup = (databaseId) =>
    client.post(`/api/v1/databases/${databaseId}/backups`, {});

  host.listBackups = async (databaseId) => {
    const res = await client.get<{ backups: unknown[] }>(`/api/v1/databases/${databaseId}/backups`);
    return res.backups ?? [];
  };

  host.restore = (databaseId, backupId) =>
    client.post(`/api/v1/databases/${databaseId}/backups/${backupId}/restore`, {});

  host.rotatePassword = <T = unknown>(databaseId: string) =>
    client.post<T>(`/api/v1/databases/${databaseId}/credentials/rotate`, {});

  host.getConnection = (databaseId, poolOnly = false) => {
    const params = poolOnly ? '?poolOnly=true' : '';
    return client.get(`/api/v1/databases/${databaseId}/connection${params}`);
  };

  host.updateSsl = (databaseId, ssl) =>
    client.post(`/api/v1/databases/${databaseId}/credentials/rotate`, { ssl });

  // ── Backup scheduling ───────────────────────────────────────────────────────

  host.getBackupSchedule = (databaseId) =>
    client.get(`/api/v1/databases/${databaseId}/backups/schedule`);

  host.updateBackupSchedule = (databaseId, schedule) =>
    client.patch(`/api/v1/databases/${databaseId}/backups/schedule`, schedule);

  host.getBackupSettings = (databaseId) =>
    client.get(`/api/v1/databases/${databaseId}/backups/settings`);
}