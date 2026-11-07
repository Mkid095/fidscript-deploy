import { Injectable } from '@nestjs/common';
import { DatabaseProvider, DatabaseCredentials, BackupInfo } from './database-provider.interface';
import { PostgresProvisionService } from './postgres-provision.service';
import { PostgresBackupService } from './postgres-backup.service';
import { PostgresHealthService } from './postgres-health.service';

/**
 * PostgresDatabaseProvider — thin wrapper composing the postgres sub-services.
 * Provisioning, backup/restore, and health logic live in dedicated services.
 */
@Injectable()
export class PostgresDatabaseProvider implements DatabaseProvider {
  constructor(
    private provisionSvc: PostgresProvisionService,
    private backupSvc: PostgresBackupService,
    private healthSvc: PostgresHealthService,
  ) {}

  async provision(databaseId: string, name: string, options?: Record<string, unknown>): Promise<DatabaseCredentials> {
    return this.provisionSvc.provision(databaseId, name, options);
  }

  async delete(credentials: DatabaseCredentials): Promise<void> {
    return this.provisionSvc.delete(credentials);
  }

  async backup(credentials: DatabaseCredentials): Promise<BackupInfo> {
    return this.backupSvc.backup(credentials);
  }

  async restore(backup: BackupInfo, targetCredentials: DatabaseCredentials): Promise<void> {
    return this.backupSvc.restore(backup, targetCredentials);
  }

  async rotatePassword(credentials: DatabaseCredentials): Promise<{ password: string }> {
    return this.provisionSvc.rotatePassword(credentials);
  }

  async getStatus(credentials: DatabaseCredentials) {
    return this.healthSvc.getStatus(credentials);
  }

  async getSize(credentials: DatabaseCredentials) {
    return this.healthSvc.getSize(credentials);
  }
}
