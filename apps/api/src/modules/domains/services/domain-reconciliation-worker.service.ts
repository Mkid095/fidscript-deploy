import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { DomainReconciliationQueueService, DomainVerificationJob } from './domain-reconciliation-queue.service';
import { DomainReconciliationService } from './domain-reconciliation.service';

const MAX_DELIVER = 3;
const BASE_RETRY_DELAY = 30; // seconds

@Injectable()
export class DomainReconciliationWorker implements OnModuleInit {
  private readonly logger = new Logger(DomainReconciliationWorker.name);
  private running = false;

  constructor(
    private readonly queueService: DomainReconciliationQueueService,
    private readonly reconciliation: DomainReconciliationService,
  ) {}

  async onModuleInit() {
    await new Promise<void>(resolve => setTimeout(resolve, 3000));
    this.start();
  }

  private async start() {
    if (this.running) return;
    this.running = true;
    this.logger.log('DomainReconciliationWorker started');
    this.poll();
  }

  private async poll() {
    while (this.running) {
      try {
        await this.processBatch();
      } catch (err) {
        this.logger.error(`[domain-recon-worker] poll error: ${err instanceof Error ? err.message : err}`);
        await new Promise<void>(resolve => setTimeout(resolve, 5000));
      }
    }
  }

  private async processBatch() {
    const consumer = await this.queueService.getConsumer();
    if (!consumer) {
      await new Promise<void>(resolve => setTimeout(resolve, 5000));
      return;
    }

    const batch = await consumer.fetch({ max_messages: 5, expires: 5000 });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    for await (const msg of batch as any) {
      let job: DomainVerificationJob;
      try {
        job = JSON.parse(msg.data.toString());
      } catch {
        this.logger.error('[domain-recon] could not parse job, discarding message');
        await msg.ack();
        continue;
      }

      const attempt = job.attempt ?? 1;

      try {
        this.logger.debug(`[domain-recon] processing domainId=${job.domainId} reason=${job.reason} attempt=${attempt}`);
        const result = await this.reconciliation.reconcile(job.domainId, job.reason);
        this.logger.log(
          `[domain-recon] done domainId=${job.domainId} score=${result.score} status=${result.status}`,
        );
        await msg.ack();
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : String(err);
        this.logger.error(
          `[domain-recon] failed domainId=${job.domainId} attempt=${attempt}: ${errMsg}`,
        );

        if (attempt < MAX_DELIVER) {
          const delay = BASE_RETRY_DELAY * Math.pow(2, attempt - 1);
          await this.queueService.enqueue(job.domainId, job.reason, delay);
          this.logger.warn(`[domain-recon] re-enqueued domainId=${job.domainId} delay=${delay}s`);
        } else {
          this.logger.error(
            `[domain-recon] giving up on domainId=${job.domainId} after ${MAX_DELIVER} attempts: ${errMsg}`,
          );
        }
        await msg.ack();
      }
    }
  }

  stop() {
    this.running = false;
  }
}
