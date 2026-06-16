import { Module } from '@nestjs/common';
import { LoggingController } from './logging.controller.js';
import { LoggingService } from './logging.service.js';

@Module({
  controllers: [LoggingController],
  providers: [LoggingService],
  exports: [LoggingService],
})
export class LoggingModule {}