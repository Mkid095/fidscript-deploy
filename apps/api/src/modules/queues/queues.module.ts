import { Module } from '@nestjs/common';
import { QueuesController } from './queues.controller';
import { QueuesService } from './queues.service';
import { QueueCrudService } from '@/modules/queues/services/queue-crud.service';
import { QueueProducerService } from '@/modules/queues/services/queue-producer.service';
import { QueueConsumerService } from '@/modules/queues/services/queue-consumer.service';

@Module({
  controllers: [QueuesController],
  providers: [
    QueuesService,
    QueueCrudService,
    QueueProducerService,
    QueueConsumerService,
  ],
  exports: [QueuesService, QueueCrudService, QueueProducerService, QueueConsumerService],
})
export class QueuesModule {}
