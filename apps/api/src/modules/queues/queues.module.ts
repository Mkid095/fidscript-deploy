import { Module } from '@nestjs/common';
import { QueuesController } from './queues.controller';
import { QueueCrudService } from './services/queue-crud.service';
import { QueueMessagesService } from './services/queue-messages.service';

@Module({
  controllers: [QueuesController],
  providers: [QueueCrudService, QueueMessagesService],
  exports: [QueueCrudService, QueueMessagesService],
})
export class QueuesModule {}
