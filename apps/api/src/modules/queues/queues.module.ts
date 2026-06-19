import { Module, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { QueuesController } from './queues.controller';
import { QueuesService } from './queues.service';
import { QueueCrudService } from '@/modules/queues/services/queue-crud.service';
import { QueueProducerService } from '@/modules/queues/services/queue-producer.service';
import { QueueConsumerService } from '@/modules/queues/services/queue-consumer.service';
import { JetStreamQueueService } from './services/jetstream-queue.service';
import { QueueWorkerService } from './services/queue-worker.service';
import { EventService } from '@/modules/events/event.service';

@Module({
  controllers: [QueuesController],
  providers: [
    Logger,
    QueuesService,
    QueueCrudService,
    QueueProducerService,
    QueueConsumerService,
    JetStreamQueueService,
    QueueWorkerService,
  ],
  exports: [QueuesService, QueueCrudService, QueueProducerService, QueueConsumerService, JetStreamQueueService],
})
export class QueuesModule implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(QueuesModule.name);

  constructor(
    private eventService: EventService,
    private jsQueue: JetStreamQueueService,
    private worker: QueueWorkerService,
  ) {}

  /**
   * Init order: EventService.onModuleInit fires first (same DI init phase).
   * Give it a moment to actually connect to NATS, then wire JetStream + start workers.
   */
  async onModuleInit() {
    await sleep(2000);
    const nc = this.eventService.getNatsConnection();
    if (!nc) {
      this.logger.warn('NATS not connected — queues running in degraded (Prisma-only) mode');
      return;
    }
    try {
      await this.jsQueue.connect(nc);
      await this.worker.start(nc);
      this.logger.log('Queue worker subsystem started');
    } catch (err: unknown) {
      this.logger.error(`Queue worker startup failed: ${(err as Error).message}`);
    }
  }

  async onModuleDestroy() {
    await this.worker.stop();
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
