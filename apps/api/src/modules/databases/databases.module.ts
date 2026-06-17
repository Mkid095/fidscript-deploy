import { Module } from '@nestjs/common';
import { DatabasesController } from './databases.controller';
import { DatabasesService } from './databases.service';
import { PostgresDatabaseProvider } from './providers/internal-pg.provider';
import { DATABASE_PROVIDER } from './providers/database-provider.interface';
import { StorageModule } from '../storage/storage.module';

@Module({
  imports: [StorageModule],
  controllers: [DatabasesController],
  providers: [
    DatabasesService,
    PostgresDatabaseProvider,
    {
      provide: DATABASE_PROVIDER,
      useClass: PostgresDatabaseProvider,
    },
  ],
  exports: [DatabasesService],
})
export class DatabasesModule {}
