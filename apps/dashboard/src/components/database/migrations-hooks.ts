import { useCallback, useState } from 'react';
import type { MigrationRecord } from '@/types';

interface UseMigrationsFormOptions {
  applyMigration: (sql: string, name?: string, source?: 'api' | 'cli' | 'manual') => Promise<void>;
}

export function useMigrationsForm({ applyMigration }: UseMigrationsFormOptions) {
  const [migrationSql, setMigrationSql] = useState('');
  const [migrationName, setMigrationName] = useState('');
  const [runningMigration, setRunningMigration] = useState(false);
  const [migrationError, setMigrationError] = useState<string | null>(null);
  const [migrationSuccess, setMigrationSuccess] = useState<string | null>(null);

  const handleApply = useCallback(async () => {
    if (!migrationSql.trim()) return;
    setRunningMigration(true);
    setMigrationError(null);
    setMigrationSuccess(null);
    try {
      await applyMigration(migrationSql.trim(), migrationName.trim() || undefined, 'manual');
      setMigrationSuccess('Migration applied successfully!');
      setMigrationSql('');
      setMigrationName('');
    } catch (err: unknown) {
      setMigrationError(err instanceof Error ? err.message : String(err));
    } finally {
      setRunningMigration(false);
    }
  }, [migrationSql, migrationName, applyMigration]);

  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const content = ev.target?.result as string;
      setMigrationSql(content);
      setMigrationName(file.name.replace(/\.sql$/i, ''));
    };
    reader.readAsText(file);
    e.target.value = '';
  }, []);

  const clearMessages = useCallback(() => {
    setMigrationError(null);
    setMigrationSuccess(null);
  }, []);

  return {
    migrationSql, setMigrationSql,
    migrationName, setMigrationName,
    runningMigration,
    migrationError, migrationSuccess,
    handleApply,
    handleFileUpload,
    clearMessages,
  };
}

export function useMigrationStats(migrations: MigrationRecord[]) {
  return {
    pending: migrations.filter(m => m.status === 'pending'),
    applied: migrations.filter(m => m.status === 'applied'),
    failed: migrations.filter(m => m.status === 'failed'),
  };
}
