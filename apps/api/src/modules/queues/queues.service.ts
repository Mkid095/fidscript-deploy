import { Injectable } from '@nestjs/common';
import { QueueCrudService } from '@/modules/queues/services/queue-crud.service';
import { QueueProducerService } from '@/modules/queues/services/queue-producer.service';
import { QueueConsumerService } from '@/modules/queues/services/queue-consumer.service';

export { QueueCrudService } from '@/modules/queues/services/queue-crud.service';

@Injectable()
export class QueuesService {
  constructor(
    private crud: QueueCrudService,
    private producer: QueueProducerService,
    private consumer: QueueConsumerService,
  ) {}

  createQueue(projectId: string, dto: any) { return this.crud.createQueue(projectId, dto); }
  listQueues(projectId: string) { return this.crud.listQueues(projectId); }
  getQueue(projectId: string, queueId: string) { return this.crud.getQueue(projectId, queueId); }
  updateQueue(projectId: string, queueId: string, dto: any) { return this.crud.updateQueue(projectId, queueId, dto); }
  deleteQueue(projectId: string, queueId: string) { return this.crud.deleteQueue(projectId, queueId); }

  publishMessage(projectId: string, queueId: string, dto: any) { return this.producer.publishMessage(projectId, queueId, dto); }
  publishBatch(projectId: string, queueId: string, dto: any) { return this.producer.publishBatch(projectId, queueId, dto); }

  consumeMessages(projectId: string, queueId: string, dto: any) { return this.consumer.consumeMessages(projectId, queueId, dto); }
  acknowledgeMessages(projectId: string, queueId: string, dto: any) { return this.consumer.acknowledgeMessages(projectId, queueId, dto); }
  retryMessages(projectId: string, queueId: string, dto: any) { return this.consumer.retryMessages(projectId, queueId, dto); }
  moveToDeadLetter(projectId: string, queueId: string, dto: any) { return this.consumer.moveToDeadLetter(projectId, queueId, dto); }
  getQueueMessages(projectId: string, queueId: string, dto?: any) { return this.consumer.getQueueMessages(projectId, queueId, dto?.status, dto?.limit, dto?.cursor); }
  getQueueStats(projectId: string, queueId: string) { return this.consumer.getQueueStats(projectId, queueId); }
  purgeQueue(projectId: string, queueId: string, dto: any) { return this.consumer.purgeQueue(projectId, queueId, dto); }
}
