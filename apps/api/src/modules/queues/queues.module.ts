import { Module } from '@nestjs/common';
import { QueuesController } from './queues.controller.js';
import { QueuesService } from './queues.service.js';

@Module({
  controllers: [QueuesController],
  providers: [QueuesService],
  exports: [QueuesService],
})
export class QueuesModule {}