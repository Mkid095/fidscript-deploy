import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { NatsConnection, JetStreamClient, JetStreamManager, AckPolicy } from 'nats';
import { EventService } from '@/modules/events/event.service';

const DOMAIN_RECON_STREAM = 'DOMAIN_RECON';
const DOMAIN_RECON_SUBJECT = 'domain.reconciliation';
const DOMAIN_RECON_DURABLE = 'domain-recon-worker';

export type VerificationReason =
  | 'scheduled'
  | 'manual'
  | 'dns_change'
  | 'ssl_expiry'
  | 'domain_created'
  | 'cloudflare_configured'
  | 'recovery';

export interface DomainVerificationJob {
  domainId: string;
  reason: VerificationReason;
  enqueuedAt: string;
  attempt?: number;
}

@Injectable()
export class DomainReconciliationQueueService implements OnModuleInit {
  private readonly logger = new Logger(DomainReconciliationQueueService.name);
  private nc: NatsConnection | null = null;
  private js: JetStreamClient | null = null;
  private jsm: JetStreamManager | null = null;

  constructor(private readonly eventService: EventService) {}

  async onModuleInit() {
    await new Promise<void>(resolve => setTimeout(resolve, 2000));
    this.nc = this.eventService.getNatsConnection();
    if (!this.nc) {
      this.logger.warn('NATS not connected — domain reconciliation queue will not function');
      return;
    }
    this.js = this.nc.jetstream();
    this.jsm = await this.nc.jetstreamManager();
    await this.ensureStream();
    this.logger.log('DomainReconciliationQueueService connected to NATS');
  }

  private async ensureStream() {
    if (!this.jsm) return;
    try {
      await this.jsm.streams.add({
        name: DOMAIN_RECON_STREAM,
        subjects: [`${DOMAIN_RECON_SUBJECT}.>`],
        max_bytes: 1 * 1024 * 1024 * 1024,
        max_age: 7 * 24 * 60 * 60 * 1_000_000_000,
        storage: 'file' as any,
      });
      this.logger.log('DOMAIN_RECON stream created/verified');
    } catch (err: unknown) {
      if (!(err as Error).message?.includes('already exists')) {
        this.logger.warn(`DOMAIN_RECON stream setup: ${(err as Error).message}`);
      }
    }

    try {
      await this.jsm.consumers.add(DOMAIN_RECON_STREAM, {
        name: DOMAIN_RECON_DURABLE,
        durable_name: DOMAIN_RECON_DURABLE,
        ack_policy: AckPolicy.Explicit,
        ack_wait: 120,
        max_deliver: 3,
        max_ack_pending: 10,
        filter_subject: DOMAIN_RECON_SUBJECT,
      });
      this.logger.log('DOMAIN_RECON durable consumer created/verified');
    } catch (err: unknown) {
      if (!(err as Error).message?.includes('already exists')) {
        this.logger.warn(`DOMAIN_RECON consumer setup: ${(err as Error).message}`);
      }
    }
  }

  /**
   * Enqueue a domain verification job.
   * @param domainId Domain to verify
   * @param reason Why verification was triggered
   * @param delaySeconds Optional delay (for retries)
   */
  async enqueue(domainId: string, reason: VerificationReason, delaySeconds?: number): Promise<{ seq: number }> {
    if (!this.js) throw new Error('JetStream not connected');
    const job: DomainVerificationJob = {
      domainId,
      reason,
      enqueuedAt: new Date().toISOString(),
      attempt: 1,
    };
    const body = JSON.stringify(job);
    const opts: Record<string, unknown> = {
      headers: {
        'x-domain-id': domainId,
        'x-reason': reason,
      },
    };
    if (delaySeconds && delaySeconds > 0) {
      (opts.headers as Record<string, string>)['Nats-Delay'] = String(
        Math.floor(delaySeconds * 1_000_000_000),
      );
    }
    const pa = await this.js.publish(`${DOMAIN_RECON_SUBJECT}.${domainId}`, body, opts);
    this.logger.debug(`[domain-recon] enqueued domainId=${domainId} reason=${reason} seq=${pa.seq}`);
    return { seq: pa.seq };
  }

  async getConsumer() {
    if (!this.js) return null;
    try {
      return await this.js.consumers.get(DOMAIN_RECON_STREAM, DOMAIN_RECON_DURABLE);
    } catch {
      return null;
    }
  }

  getStreamName() { return DOMAIN_RECON_STREAM; }
  getDurableName() { return DOMAIN_RECON_DURABLE; }
}
