import { Module } from '@nestjs/common';
import { DatabasesController } from './databases.controller.js';
import { DatabasesService } from './databases.service.js';
import { InternalPgProvider } from './providers/internal-pg.provider.js';
import { DATABASE_PROVIDER } from './providers/database-provider.interface.js';

const DATABASE_PROVIDER_TOKEN = {
  provide: DATABASE_PROVIDER,
  useClass: InternalPgProvider,
};

@Module({
  controllers: [DatabasesController],
  providers: [DatabasesService, InternalPgProvider, DATABASE_PROVIDER_TOKEN],
  exports: [DatabasesService],
})
export class DatabasesModule {}