import { Module } from '@nestjs/common';
import { DatabasesController } from './databases.controller';
import { DatabasesService } from './databases.service';
import { InternalPgProvider } from './providers/internal-pg.provider';
import { DATABASE_PROVIDER } from './providers/database-provider.interface';
import { StorageModule } from '../storage/storage.module';

@Module({
  imports: [StorageModule],
  controllers: [DatabasesController],
  providers: [
    DatabasesService,
    InternalPgProvider,
    {
      provide: DATABASE_PROVIDER,
      useClass: InternalPgProvider,
    },
  ],
  exports: [DatabasesService],
})
export class DatabasesModule {}
