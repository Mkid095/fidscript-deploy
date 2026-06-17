import { Injectable, Inject } from '@nestjs/common';
import { DatabaseProvider, DATABASE_PROVIDER } from '@/modules/databases/providers/index';
import { DbCrudService } from '@/modules/databases/services/db-crud.service';
import { DbBackupService } from '@/modules/databases/services/db-backup.service';
import { DbCredentialsService } from '@/modules/databases/services/db-credentials.service';

export { DbCrudService } from '@/modules/databases/services/db-crud.service';

@Injectable()
export class DatabasesService {
  constructor(
    @Inject(DATABASE_PROVIDER) private dbProvider: DatabaseProvider,
    private crud: DbCrudService,
    private backup: DbBackupService,
    private credentials: DbCredentialsService,
  ) {}

  createDatabase(projectId: string, dto: any) {
    return this.crud.createDatabase(this.dbProvider, projectId, dto);
  }

  listDatabases(projectId: string) {
    return this.crud.listDatabases(projectId);
  }

  getDatabase(projectId: string, databaseId: string) {
    return this.crud.getDatabase(projectId, databaseId);
  }

  updateDatabase(projectId: string, databaseId: string, dto: any) {
    return this.crud.updateDatabase(projectId, databaseId, dto);
  }

  async deleteDatabase(projectId: string, databaseId: string) {
    const database = await this.crud.getDatabase(projectId, databaseId);
    return this.crud.deleteDatabase(this.dbProvider, projectId, databaseId, (database as any).connectionInfo);
  }

  createBackup(projectId: string, databaseId: string, dto: any) {
    return this.backup.createBackup(projectId, databaseId, dto);
  }

  listBackups(projectId: string, databaseId: string) {
    return this.backup.listBackups(projectId, databaseId);
  }

  restoreBackup(projectId: string, databaseId: string, dto: any) {
    return this.backup.restoreBackup(projectId, databaseId, dto);
  }

  rotateCredentials(projectId: string, databaseId: string) {
    return this.credentials.rotateCredentials(projectId, databaseId);
  }

  getConnectionInfo(projectId: string, databaseId: string, dto: any) {
    return this.credentials.getConnectionInfo(projectId, databaseId, dto);
  }

  getDatabaseStatus(projectId: string, databaseId: string) {
    return this.credentials.getStatus(projectId, databaseId);
  }
}
