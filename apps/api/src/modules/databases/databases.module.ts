import { Module } from '@nestjs/common';
import { DatabasesController } from '@/modules/databases/controllers/databases.controller';
import { DatabasesService } from '@/modules/databases/services/databases.service';
import { DbCrudService } from '@/modules/databases/services/db-crud.service';
import { DbBackupService } from '@/modules/databases/services/db-backup.service';
import { DbCredentialsService } from '@/modules/databases/services/db-credentials.service';
import { PostgresDatabaseProvider } from '@/modules/databases/providers/internal-pg.provider';
import { PostgresAdminService } from '@/modules/databases/providers/postgres-admin.service';
import { PostgresProvisionService } from '@/modules/databases/providers/postgres-provision.service';
import { PostgresBackupService } from '@/modules/databases/providers/postgres-backup.service';
import { PostgresHealthService } from '@/modules/databases/providers/postgres-health.service';
import { DATABASE_PROVIDER } from '@/modules/databases/providers/database-provider.interface';
import { StorageModule } from '@/modules/storage/storage.module';

@Module({
  imports: [StorageModule],
  controllers: [DatabasesController],
  providers: [
    DatabasesService,
    DbCrudService,
    DbBackupService,
    DbCredentialsService,
    PostgresDatabaseProvider,
    PostgresAdminService,
    PostgresProvisionService,
    PostgresBackupService,
    PostgresHealthService,
    { provide: DATABASE_PROVIDER, useClass: PostgresDatabaseProvider },
  ],
  exports: [DatabasesService],
})
export class DatabasesModule {}
