import { Module } from '@nestjs/common';
import { DatabasesController } from './databases.controller';
import { DatabasesService } from './databases.service';
import { InternalPgProvider } from './providers/internal-pg.provider';
import { DATABASE_PROVIDER } from './providers/database-provider.interface';

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