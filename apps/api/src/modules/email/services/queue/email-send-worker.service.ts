/**
 * Email send worker — consumes from NATS JetStream and delivers via SMTP.
 *
 * Runs as a NestJS hosted service within the API process (same process, separate
 * concurrency slot). Each message is acknowledged only after:
 *   1. SMTP delivery attempt completes (sent / soft-bounce / hard bounce)
 *   2. EmailMessage status updated
 *   3. EmailDeliveryAttempt record written
 *   4. Retry scheduled if needed
 *
 * Failure taxonomy drives retry:
 *   SOFT_BOUNCE / SMTP_TIMEOUT / NETWORK_ERROR / PROVIDER_ERROR → retry with backoff
 *   RECIPIENT_REJECTED / SPAM_REJECTED / SMTP_AUTH_FAILURE / SYSTEM_ERROR → no retry, mark DEAD/FAILED
 */
import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { EmailSendQueueService, EmailSendJob } from './email-send-queue.service';
import { EventService } from '@/modules/events/event.service';
import { NatsConnection } from 'nats';

const EMAIL_SEND_STREAM = 'EMAIL_SEND';
const EMAIL_SEND_DURABLE = 'email-send-worker';
const MAX_RETRIES = 5;

@Injectable()
export class EmailSendWorkerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(EmailSendWorkerService.name);
  private nc: NatsConnection | null = null;
  private subscription: any = null;
  private running = false;

  constructor(
    private readonly queueService: EmailSendQueueService,
    private readonly eventService: EventService,
  ) {}

  async onModuleInit() {
    await new Promise<void>(resolve => setTimeout(resolve, 3000));
    this.nc = this.eventService.getNatsConnection();
    if (!this.nc) {
      this.logger.warn('NATS not connected — email send worker will not start');
      return;
    }
    this.running = true;
    this.startConsuming();
    this.logger.log('EmailSendWorkerService started');
  }

  onModuleDestroy() {
    this.running = false;
    this.subscription?.unsubscribe();
    this.logger.log('EmailSendWorkerService stopped');
  }

  private startConsuming() {
    if (!this.nc) return;
    const js = this.nc.jetstream();
    try {
      this.subscription = js.consumers.get(EMAIL_SEND_STREAM, EMAIL_SEND_DURABLE);
    } catch {
      // Consumer doesn't exist yet — will be created by queue service
      this.logger.warn('EMAIL_SEND consumer not found — will be created on first enqueue');
      return;
    }

    this.consumeLoop();
  }

  private async consumeLoop() {
    if (!this.nc || !this.running) return;
    const js = this.nc.jetstream();

    const consumer = await js.consumers.get(EMAIL_SEND_STREAM, EMAIL_SEND_DURABLE);
    while (this.running) {
      try {
        const msg = await consumer.next();
        if (!msg) continue;

        const job: EmailSendJob = JSON.parse(msg.data.toString());
        await this.processJob(job);
        await msg.ack();
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        this.logger.error(`Consumer error: ${msg}`);
        await new Promise(r => setTimeout(r, 1000)); // back off on error
      }
    }
  }

  private async processJob(job: EmailSendJob): Promise<void> {
    this.logger.log(`Processing email job messageId=${job.messageId} attempt=${job.attempt}`);

    // Import here to avoid circular dependency and to get a fresh PrismaClient
    const { PrismaService } = await import('@/prisma/prisma.service');
    const prisma = new PrismaService();

    try {
      await prisma.$connect();
    } catch {
      this.logger.error(`[email-worker] Could not connect to database for ${job.messageId}`);
      return;
    }

    const startTime = Date.now();

    try {
      // 1. Attempt SMTP delivery via SmtpSendService
      const result = await this.deliverEmail(job);
      const durationMs = Date.now() - startTime;

      // 2. Determine failure type and new status
      const { status, failureType, errorMsg } = this.classifyResult(result, job.attempt);

      // 3. Upsert delivery attempt record
      await this.recordAttempt(prisma, job, {
        status,
        response: errorMsg,
        durationMs,
        failureType,
      });

      // 4. Update EmailMessage status
      const updateData: Record<string, unknown> = {
        status,
        lastAttemptAt: new Date(),
        retryCount: job.attempt,
      };
      if (errorMsg) updateData['error'] = errorMsg;

      if (status === 'SOFT_BOUNCE' || status === 'PROCESSING') {
        updateData['nextRetryAt'] = this.calcNextRetry(job.attempt);
        await prisma.emailMessage.update({ where: { id: job.messageId }, data: updateData });
        // Schedule retry
        await this.queueService.scheduleRetry(job);
      } else if (status === 'DEAD' || status === 'FAILED' || status === 'BOUNCED') {
        updateData['nextRetryAt'] = null;
        await prisma.emailMessage.update({ where: { id: job.messageId }, data: updateData });
      } else {
        // SENT or DELIVERED
        updateData['nextRetryAt'] = null;
        await prisma.emailMessage.update({ where: { id: job.messageId }, data: updateData });
      }

      // 5. Emit platform event
      await this.eventService.emit('email.status_changed', job.projectId, {
        messageId: job.messageId,
        status,
        attempt: job.attempt,
        failureType,
        error: errorMsg,
      }, {});

      this.logger.log(
        `Email ${job.messageId} → ${status} (attempt ${job.attempt}, ${durationMs}ms)`,
      );
    } finally {
      await prisma.$disconnect();
    }
  }

  private async deliverEmail(job: EmailSendJob): Promise<{ accepted: boolean; error?: string; isBounce: boolean }> {
    // Lazy import to avoid pulling nodemailer in at module load
    const { createStalwartTransport } = await import('@/modules/email/common/stalwart-transport');
    const { ConfigService } = await import('@nestjs/config');

    const config = new ConfigService();
    const smtpHost = config.get<string>('STALWART_SMTP_HOST', 'fidscript_stalwart');
    const smtpPort = Number(config.get<string>('STALWART_SMTP_PORT', '465'));
    const smtpUser = config.get<string>('SMTP_SUBMISSION_USER', 'admin');
    const smtpPass = config.get<string>('SMTP_SUBMISSION_PASS', '');
    const mailHost = config.get<string>('PLATFORM_MAIL_HOST', 'mail.deploy.fidscript.com');

    try {
      const transporter = await createStalwartTransport({ host: smtpHost, port: smtpPort, user: smtpUser, pass: smtpPass });
      const result = await transporter.sendMail({
        from: job.from,
        to: job.to,
        subject: job.subject,
        text: job.text,
        html: job.html,
        replyTo: job.replyTo,
      });
      return { accepted: (result.accepted ?? [job.to]).length > 0, isBounce: false };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      const isBounce = msg.includes('550') || msg.includes('user unknown') || msg.includes('mailbox not found');
      return { accepted: false, error: msg, isBounce };
    }
  }

  private classifyResult(
    result: { accepted: boolean; error?: string; isBounce: boolean },
    attempt: number,
  ): { status: string; failureType: string | null; errorMsg: string | undefined } {
    if (result.accepted) {
      return { status: 'SENT', failureType: 'NONE', errorMsg: undefined };
    }

    const errorMsg = result.error ?? 'Unknown error';
    const isHardBounce = result.isBounce || attempt >= MAX_RETRIES;

    if (isHardBounce) {
      return { status: 'BOUNCED', failureType: 'RECIPIENT_REJECTED', errorMsg };
    }

    // Soft failures that warrant retry
    if (
      errorMsg.includes('timeout') ||
      errorMsg.includes('ECONNREFUSED') ||
      errorMsg.includes('ETIMEDOUT') ||
      errorMsg.includes('connection refused')
    ) {
      return { status: 'SOFT_BOUNCE', failureType: 'NETWORK_ERROR', errorMsg };
    }
    if (errorMsg.includes('authentication') || errorMsg.includes('535')) {
      return { status: 'DEAD', failureType: 'SMTP_AUTH_FAILURE', errorMsg };
    }
    if (errorMsg.includes('spam') || errorMsg.includes('550')) {
      return { status: 'BOUNCED', failureType: 'SPAM_REJECTED', errorMsg };
    }

    // Unknown error — soft bounce for retry
    return { status: 'SOFT_BOUNCE', failureType: 'PROVIDER_ERROR', errorMsg };
  }

  private async recordAttempt(
    prisma: any,
    job: EmailSendJob,
    result: { status: string; response?: string; durationMs: number; failureType: string | null },
  ) {
    try {
      await (prisma as any).emailDeliveryAttempt.create({
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
