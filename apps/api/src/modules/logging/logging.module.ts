import { Module } from '@nestjs/common';
import { LoggingController } from './controllers/logging.controller';
import { LogStreamService } from './services/log-stream.service';
import { LogEntryService } from './services/log-entry.service';

@Module({
  controllers: [LoggingController],
  providers: [LogStreamService, LogEntryService],
  exports: [LogStreamService, LogEntryService],
})
export class LoggingModule {}
