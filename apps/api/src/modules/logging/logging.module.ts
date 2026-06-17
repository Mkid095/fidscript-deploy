import { Module } from '@nestjs/common';
import { LoggingController } from './controllers/logging.controller';
import { LogStreamService } from './services/log-stream.service';
import { LogWriteService } from './services/log-write.service';
import { LogQueryService } from './services/log-query.service';

@Module({
  controllers: [LoggingController],
  providers: [LogStreamService, LogWriteService, LogQueryService],
  exports: [LogStreamService, LogWriteService, LogQueryService],
})
export class LoggingModule {}
