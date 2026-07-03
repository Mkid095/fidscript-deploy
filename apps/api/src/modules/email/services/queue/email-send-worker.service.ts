/**
 * Email send worker — consumes from NATS JetStream and delivers via SMTP.
 *
 * Production execution plane:
 *   - Uses constructor-injected PrismaService (singleton, no per-message connect/disconnect)
 *   - Uses constructor-injected ConfigService (properly wired to process.env)
 *   - Delegates bounce classification to BounceParserService (single source of truth)
 *   - Injects tracking pixel + click redirects before SMTP send
 *   - Emits granular events (email.sent, email.bounced, email.failed) for webhook dispatch
 *
 * Ack policy: each message is ack'd after processing completes (success OR failure
 * that doesn't warrant NATS-level retry). Soft bounces schedule a new delayed job.
 */
import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '@/prisma/prisma.service';
import { EmailSendQueueService, EmailSendJob } from './email-send-queue.service';
import { EmailTrackingService } from '@/modules/email/services/email-tracking.service';
import { BounceParserService } from '@/modules/email/services/bounce-parser.service';
import { EventService } from '@/modules/events/event.service';
import { NatsConnection } from 'nats';

const EMAIL_SEND_STREAM = 'EMAIL_SEND';
const EMAIL_SEND_DURABLE = 'email-send-worker';
const MAX_RETRIES = 5;

@Injectable()
export class EmailSendWorkerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(EmailSendWorkerService.name);
  private nc: NatsConnection | null = null;
  private running = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly queueService: EmailSendQueueService,
    private readonly trackingService: EmailTrackingService,
    private readonly bounceParser: BounceParserService,
    private readonly eventService: EventService,
  ) {}

  async onModuleInit() {
    // Wait for EventService to connect to NATS + queue service to create the consumer
    await new Promise<void>(resolve => setTimeout(resolve, 3000));
    this.nc = this.eventService.getNatsConnection();
    if (!this.nc) {
      this.logger.warn('NATS not connected — email send worker will not start');
      return;
    }
    this.running = true;
    this.consumeLoop();
    this.logger.log('EmailSendWorkerService started');
  }

  onModuleDestroy() {
    this.running = false;
    this.logger.log('EmailSendWorkerService stopped');
  }

  /**
   * Main consumer loop. Fetches messages from the durable consumer, processes them,
   * and acks after completion. Errors trigger a 1s backoff to avoid tight error loops.
   */
  private async consumeLoop() {
    if (!this.nc || !this.running) return;
    const js = this.nc.jetstream();

    let consumer: any;
    try {
      consumer = await js.consumers.get(EMAIL_SEND_STREAM, EMAIL_SEND_DURABLE);
    } catch {
      this.logger.warn('EMAIL_SEND consumer not found — will retry in 5s');
      await new Promise(r => setTimeout(r, 5000));
      if (this.running) this.consumeLoop();
      return;
    }

    while (this.running) {
      try {
        const msg = await consumer.next({ max_wait: 10000 });
        if (!msg) continue;

        const traceparent = msg.headers?.['traceparent']?.toString() ?? 'unknown';
        const job: EmailSendJob = JSON.parse(msg.data.toString());
        await this.processJob(job, traceparent);
        await msg.ack();
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : String(err);
        this.logger.error(`Consumer error: ${errMsg}`);
        await new Promise(r => setTimeout(r, 1000));
      }
    }
  }

  /**
   * Process a single email job end-to-end:
   *   1. Mark PROCESSING
   *   2. Inject trackers into HTML body
   *   3. Attempt SMTP delivery
   *   4. Delegate bounce classification to BounceParserService
   *   5. Record delivery attempt
   *   6. Update message status + schedule retry or suppress
   *   7. Emit granular event for webhook dispatch
   *
   * @param traceparent  W3C traceparent from NATS headers — included in all log lines
   */
  private async processJob(job: EmailSendJob, traceparent: string): Promise<void> {
    this.logger.log(`[trace:${traceparent}] Processing email job messageId=${job.messageId} attempt=${job.attempt}`);
    const startTime = Date.now();

    try {
      // Mark as PROCESSING
      await this.prisma.emailMessage.update({
        where: { id: job.messageId },
        data: { status: 'PROCESSING' as any, lastAttemptAt: new Date() } as any,
      }).catch(() => {});

      // Inject tracking pixel + click redirects into HTML body
      let htmlBody = job.html;
      if (htmlBody) {
        const trackingDomain = this.config.get<string>('PLATFORM_DOMAIN', 'deploy.fidscript.com');
        htmlBody = this.trackingService.injectTrackers(htmlBody, job.messageId, trackingDomain);
      }

      // Attempt SMTP delivery
      const result = await this.deliverEmail(job, htmlBody);
      const durationMs = Date.now() - startTime;

      // Delegate classification to BounceParserService (single source of truth)
      let status: string;
      let failureType: string | null = null;
      let errorMsg: string | undefined;

      if (result.accepted) {
        status = 'SENT';
        failureType = 'NONE';
      } else {
        // Use canonical bounce parser for classification + suppression
        const parsed = this.bounceParser.parse({
          rawResponse: result.error,
          recipient: job.to,
          messageId: job.messageId,
        });

        if (parsed.type === 'hard' || parsed.type === 'complaint') {
          status = 'BOUNCED';
          failureType = parsed.type === 'complaint' ? 'SPAM_REJECTED' : 'RECIPIENT_REJECTED';
          errorMsg = parsed.reason;
          // BounceParserService.process() handles suppression + event emission
          await this.bounceParser.process(parsed);
        } else if (parsed.type === 'soft' && job.attempt < MAX_RETRIES) {
          status = 'SOFT_BOUNCE';
          failureType = 'PROVIDER_ERROR';
          errorMsg = parsed.reason;
        } else if (job.attempt >= MAX_RETRIES) {
          status = 'DEAD';
          failureType = 'SYSTEM_ERROR';
          errorMsg = parsed.reason ?? 'Max retries exhausted';
        } else {
          status = 'SOFT_BOUNCE';
          failureType = 'PROVIDER_ERROR';
          errorMsg = parsed.reason;
        }
      }

      // Record delivery attempt
      await this.recordAttempt(job, {
        status,
        response: errorMsg,
        durationMs,
        failureType,
      });

      // Update message status
      const updateData: Record<string, unknown> = {
        status,
        lastAttemptAt: new Date(),
        retryCount: job.attempt,
        failureType: failureType !== 'NONE' ? failureType : null,
      };
      if (errorMsg) updateData['error'] = errorMsg;

      if (status === 'SOFT_BOUNCE') {
        updateData['nextRetryAt'] = this.calcNextRetry(job.attempt);
        await this.prisma.emailMessage.update({
          where: { id: job.messageId },
          data: updateData as any,
        }).catch(() => {});
        // Schedule retry via NATS delayed publish
        await this.queueService.scheduleRetry(job);
      } else {
        updateData['nextRetryAt'] = null;
        await this.prisma.emailMessage.update({
          where: { id: job.messageId },
          data: updateData as any,
        }).catch(() => {});
      }

      // Emit GRANULAR event (not status_changed) so webhook dispatcher can map it
      if (status === 'SENT') {
        await this.eventService.emit('email.sent', job.projectId, {
          messageId: job.messageId,
          to: job.to,
          from: job.from,
          subject: job.subject,
          attempt: job.attempt,
          durationMs,
        }, {});
      } else if (status === 'BOUNCED') {
        // email.bounced is already emitted by BounceParserService.process()
        // Don't double-emit
      } else if (status === 'DEAD' || status === 'FAILED') {
        await this.eventService.emit('email.failed', job.projectId, {
          messageId: job.messageId,
          to: job.to,
          from: job.from,
          failureType,
          error: errorMsg,
          attempts: job.attempt,
        }, {});
      }

      this.logger.log(
        `Email ${job.messageId} → ${status} (attempt ${job.attempt}, ${durationMs}ms)`,
      );
    } catch (err) {
      // Unexpected error — record as failed attempt, schedule retry if under limit
      const errMsg = err instanceof Error ? err.message : String(err);
      const durationMs = Date.now() - startTime;
      this.logger.error(`Job processing failed for ${job.messageId}: ${errMsg}`);

      await this.recordAttempt(job, {
        status: 'SOFT_BOUNCE',
        response: errMsg,
        durationMs,
        failureType: 'SYSTEM_ERROR',
      }).catch(() => {});

      if (job.attempt < MAX_RETRIES) {
        await this.queueService.scheduleRetry(job);
      } else {
        await this.prisma.emailMessage.update({
          where: { id: job.messageId },
          data: { status: 'DEAD' as any, error: errMsg, nextRetryAt: null } as any,
        }).catch(() => {});
      }
    }
  }

  /**
   * Deliver email via SMTP using constructor-injected ConfigService.
   * Returns raw SMTP result for the bounce parser to classify.
   */
  private async deliverEmail(job: EmailSendJob, htmlBody?: string): Promise<{ accepted: boolean; error?: string }> {
    const { createStalwartTransport } = await import('@/modules/email/common/stalwart-transport');

    const smtpHost = this.config.get<string>('STALWART_SMTP_HOST', 'fidscript_stalwart');
    const smtpPort = Number(this.config.get<string>('STALWART_SMTP_PORT', '465'));
    const smtpUser = this.config.get<string>('SMTP_SUBMISSION_USER', 'admin');

    // Load SMTP password from file (production) or env (dev)
    const tokenFile = this.config.get<string>('STALWART_ADMIN_TOKEN_FILE', '/run/secrets/stalwart_admin_token');
    let smtpPass = this.config.get<string>('SMTP_SUBMISSION_PASS', '');
    if (!smtpPass) {
      try {
        const fs = await import('fs');
        smtpPass = fs.readFileSync(tokenFile, 'utf8').trim();
      } catch {
        smtpPass = this.config.get<string>('STALWART_ADMIN_TOKEN', '');
      }
    }

    try {
      const transporter = await createStalwartTransport({
        host: smtpHost,
        port: smtpPort,
        user: smtpUser,
        pass: smtpPass,
      });
      const result = await transporter.sendMail({
        from: job.from,
        to: job.to,
        subject: job.subject,
        text: job.text,
        html: htmlBody,
        replyTo: job.replyTo,
      });
      return { accepted: (result.accepted ?? [job.to]).length > 0 };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return { accepted: false, error: msg };
    }
  }

  private async recordAttempt(
    job: EmailSendJob,
    result: { status: string; response?: string; durationMs: number; failureType: string | null },
  ): Promise<void> {
    try {
      await (this.prisma as any).emailDeliveryAttempt.create({
        data: {
          messageId: job.messageId,
          attempt: job.attempt,
          provider: 'stalwart',
          status: result.status,
          response: result.response,
          durationMs: result.durationMs,
          failureType: result.failureType,
        },
      });
    } catch (err) {
      this.logger.warn(`Failed to record delivery attempt: ${(err as Error).message}`);
    }
  }

  private calcNextRetry(attempt: number): Date {
    const delays: Record<number, number> = {
      1: 0,
      2: 30 * 60,
      3: 2 * 60 * 60,
      4: 8 * 60 * 60,
      5: 24 * 60 * 60,
    };
    const delaySeconds = delays[attempt + 1] ?? delays[5] ?? 86400;
    return new Date(Date.now() + delaySeconds * 1000);
  }
}
