import { Module } from '@nestjs/common';
import { DatabasesController } from '@/modules/databases/controllers/databases.controller';
import { DatabaseDataController } from '@/modules/databases/controllers/database-data.controller';
import { LiveQueryController } from '@/modules/databases/controllers/live-query.controller';
import { LiveQueryManager } from '@/modules/databases/services/live-query.manager';
import { DatabasesService } from '@/modules/databases/services/databases.service';
import { DbCrudService } from '@/modules/databases/services/db-crud.service';
import { DbBackupService } from '@/modules/databases/services/db-backup.service';
import { DbCredentialsService } from '@/modules/databases/services/db-credentials.service';
import { DbPoolService } from '@/modules/databases/services/db-pool.service';
import { DbSchemaService } from '@/modules/databases/services/db-schema.service';
import { DbQueryService } from '@/modules/databases/services/db-query.service';
import { DbDataService } from '@/modules/databases/services/db-data.service';
import { DbRealtimeService } from '@/modules/databases/services/db-realtime.service';
import { DbMigrationService } from '@/modules/databases/services/db-migration.service';
import { SchemaCacheService } from '@/modules/databases/services/schema-cache.service';
import { PostgresDatabaseProvider } from '@/modules/databases/providers/internal-pg.provider';
import { PostgresAdminService } from '@/modules/databases/providers/postgres-admin.service';
import { PostgresProvisionService } from '@/modules/databases/providers/postgres-provision.service';
import { PostgresBackupService } from '@/modules/databases/providers/postgres-backup.service';
import { PostgresHealthService } from '@/modules/databases/providers/postgres-health.service';
import { NotifyRealtimeProvider } from '@/modules/databases/providers/realtime/notify-realtime.provider';
import { DATABASE_PROVIDER } from '@/modules/databases/providers/database-provider.interface';
import { EventsModule } from '@/modules/events/events.module';
import { StorageModule } from '@/modules/storage/storage.module';
import { ProjectsModule } from '@/modules/projects/projects.module';
import { AuthModule } from '@/modules/auth/auth.module';

@Module({
  // AuthModule provides ApiKeyOrJwtGuard so the BaaS data routes accept both
  // JWT (dashboard) and project API keys (external apps via X-API-Key).
  imports: [StorageModule, ProjectsModule, EventsModule, AuthModule],
  controllers: [DatabasesController, DatabaseDataController, LiveQueryController],
  providers: [
    DatabasesService,
    DbCrudService,
    DbBackupService,
    DbCredentialsService,
    DbPoolService,
    DbSchemaService,
    DbQueryService,
    DbDataService,
    DbRealtimeService,
    DbMigrationService,
    LiveQueryManager,
    SchemaCacheService,
    PostgresDatabaseProvider,
    PostgresAdminService,
    PostgresProvisionService,
    PostgresBackupService,
    PostgresHealthService,
    NotifyRealtimeProvider,
    { provide: DATABASE_PROVIDER, useClass: PostgresDatabaseProvider },
  ],
  exports: [
    DatabasesService,
    DbPoolService,
    DbSchemaService,
    DbQueryService,
    DbDataService,
    DbRealtimeService,
    NotifyRealtimeProvider,
    SchemaCacheService,
    LiveQueryManager,
  ],
})
export class DatabasesModule {}
