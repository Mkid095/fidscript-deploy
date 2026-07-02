import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventService } from '@/modules/events/event.service';
import type { EventType } from '@fidscript/events';
import { RedisService } from '@/modules/redis/redis.service';
import { PrismaService } from '@/prisma/prisma.service';
import { DnsStep, ProxyStep, CertificateStep, EmailStep, HealthStep } from './steps/installation-steps';
import { InstallationStepError, InstallationStep, INSTALLATION_STEPS } from './installation.error';
import {
  ConfigureInstallationDto,
  StepValidationIssue,
  StepResult,
  DiscoveryResult,
} from './dto';
import { randomUUID } from 'crypto';
import { Prisma, Role, AuthMethod } from '@prisma/client';
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import * as bcrypt from 'bcrypt';

const LOCK_KEY = 'installation:orchestrate';
const LOCK_TOKEN_TTL_MS = 5 * 60 * 1000;
const LOCK_RENEW_INTERVAL_MS = 60_000; // renew every 60s during long-running steps

@Injectable()
export class InstallationOrchestratorService {
  private readonly logger = new Logger(InstallationOrchestratorService.name);

  constructor(
    private readonly events: EventService,
    private readonly redis: RedisService,
    private readonly prisma: PrismaService,
    private readonly dnsStep: DnsStep,
    private readonly proxyStep: ProxyStep,
    private readonly certificateStep: CertificateStep,
    private readonly emailStep: EmailStep,
    private readonly healthStep: HealthStep,
    private readonly configService: ConfigService,
  ) {}

  // ─── Discovery ─────────────────────────────────────────────────────────

  async discover(): Promise<DiscoveryResult> {
    const serverIp = this.configService.get<string>('SERVER_IP') ?? '0.0.0.0';

    let adminEmail: string | null = null;
    try {
      const admin = await this.prisma.user.findFirst({
        where: { role: { in: ['ADMIN', 'OWNER'] } },
        select: { email: true },
        orderBy: { createdAt: 'asc' },
      });
      adminEmail = admin?.email ?? null;
    } catch { /* DB not seeded yet */ }

    let existingInstallation: DiscoveryResult['existingInstallation'] = null;
    let lifecycle = 'UNCONFIGURED';
    try {
      const status = await this.prisma.installationStatus.findFirst();
      lifecycle = status?.lifecycle ?? 'UNCONFIGURED';
      if (lifecycle === 'CONFIGURED') {
        const [projectCount, userCount] = await Promise.all([
          this.prisma.project.count(),
          this.prisma.user.count(),
        ]);
        existingInstallation = { version: '1.0.0', projectCount, userCount };
      }
    } catch { /* tables don't exist */ }

    // CF token is written to /run/secrets/cf_api_token by the installer — we check the env
    const cfFromEnv = !!process.env.CLOUDFLARE_API_TOKEN_FILE;

    return {
      serverIp,
      adminEmail,
      existingInstallation,
      lifecycle,
      dockerAvailable: true,
      traefikConfigured: true,
      cloudflareTokenFound: cfFromEnv,
      existingCertificateFound: lifecycle === 'CONFIGURED',
    };
  }

  // ─── Status ────────────────────────────────────────────────────────

  async getStatus() {
    let status = await this.prisma.installationStatus.findFirst();
    if (!status) {
      status = await this.prisma.installationStatus.create({
        data: { id: 'installation', lifecycle: 'UNCONFIGURED' },
      });
    }
    let settings = { lifecycle: status.lifecycle, platformDomain: '', authMethod: null as string | null };
    try {
      const s = await this.prisma.installationSettings.findFirst();
      if (s) {
        settings = { lifecycle: status.lifecycle, platformDomain: s.platformDomain, authMethod: s.authMethod };
      }
    } catch { /* not set yet */ }
    const lastOp = status.lastOperationId
      ? await this.prisma.installationOperation.findUnique({ where: { id: status.lastOperationId } })
      : null;
    return {
      lifecycle: settings.lifecycle,
      platformDomain: settings.platformDomain,
      authMethod: settings.authMethod,
      lastOperation: lastOp ?? null,
    };
  }

  // ─── Validation (dry-run) ────────────────────────────────────────

  async validate(dto: Partial<ConfigureInstallationDto>): Promise<StepValidationIssue[]> {
    const domain = dto.platformDomain ?? this.configService.get<string>('PLATFORM_DOMAIN') ?? '';
    const serverIp = dto.serverIp ?? this.configService.get<string>('SERVER_IP') ?? '';
    return Promise.all([
      this.dnsStep.validate({ domain, serverIp }),
      this.proxyStep.validate({ domain }),
      this.certificateStep.validate({ domain }),
      this.emailStep.validate({ adminEmail: dto.adminEmail ?? '' }),
      this.healthStep.validate(),
    ]);
  }

  // ─── Configure ────────────────────────────────────────────────────

  async configure(dto: ConfigureInstallationDto): Promise<{ operationId: string }> {
    const lockToken = randomUUID();
    const acquired = await this.redis.acquireLock(LOCK_KEY, lockToken, LOCK_TOKEN_TTL_MS);
    if (!acquired) {
      throw new BadRequestException('Configuration is already in progress. Try again shortly.');
    }

    let operationId = '';

    try {
      // ── Phase 1: Atomic setup (transaction) ──────────────────────────
      // All DB writes here happen together — if any fails, nothing is written.
      // No external I/O here so the transaction is brief.
      const { op } = await this.prisma.$transaction(async (tx) => {
        // Abandon only the single orphaned RUNNING operation from the previous attempt.
        // FAILED records are never touched — they preserve audit history.
        const prevStatus = await tx.installationStatus.findFirst();
        if (prevStatus?.lastOperationId) {
          await tx.installationOperation.updateMany({
            where: { id: prevStatus.lastOperationId, status: 'RUNNING' },
            data: { status: 'ABANDONED' },
          });
        }

        const prevSettings = await tx.installationSettings.findFirst();
        const prevSnapshot: Prisma.InputJsonValue | undefined = prevSettings
          ? (JSON.parse(JSON.stringify(prevSettings)) as Prisma.InputJsonValue)
          : undefined;

        const operation = await tx.installationOperation.create({
          data: { type: 'CONFIGURE', status: 'RUNNING', previousSnapshot: prevSnapshot },
        });

        // Transition any previous lifecycle state → CONFIGURING atomically
        await tx.installationStatus.upsert({
          where: { id: 'installation' },
          create: { id: 'installation', lifecycle: 'CONFIGURING', lastOperationId: operation.id },
          update: { lifecycle: 'CONFIGURING', lastOperationId: operation.id },
        });

        return { op: operation };
      });

      operationId = op.id;
      this.events.emit('installation.lifecycle.operation.started', null, { operationId: op.id, type: 'CONFIGURE' });

      // ── Phase 2: External work (outside transaction) ──────────────────
      // These involve network/disk I/O and may take time.
      // The Redis lock is still held, preventing concurrent configure() calls.
      // If this phase fails, the catch block below transitions to FAILED.

      // Write Cloudflare token to secret file — never written to the DB
      if (dto.cloudflareApiToken) {
        const secretsDir = process.env.CLOUDFLARE_API_TOKEN_FILE
          ? join(process.env.CLOUDFLARE_API_TOKEN_FILE, '..')
          : '/run/secrets';
        try {
          mkdirSync(secretsDir, { recursive: true });
          writeFileSync('/run/secrets/cf_api_token', dto.cloudflareApiToken, { mode: 0o600 });
        } catch (err) {
          this.logger.warn(`Could not write CF token to /run/secrets: ${err}`);
        }
      }

      // Renew lock every 60s during external work — prevents expiry while waiting
      // for DNS propagation or certificate issuance which can exceed the 5m TTL.
      const heartbeat = setInterval(() => {
        this.redis.renewLock(LOCK_KEY, lockToken, LOCK_TOKEN_TTL_MS).catch(() => {/* best-effort */});
      }, LOCK_RENEW_INTERVAL_MS);

      const stepResults = await this.runSteps(dto);

      clearInterval(heartbeat);

      // ── Phase 3: Atomic completion (transaction) ─────────────────────
      // All writes here happen together — if any fails, nothing is written.
      await this.prisma.$transaction(async (tx) => {
        await tx.installationOperation.update({
          where: { id: op.id },
          data: {
            status: 'COMPLETED',
            currentStep: null,
            steps: stepResults as unknown as Prisma.InputJsonValue,
            completedAt: new Date(),
          },
        });

        await tx.installationSettings.upsert({
          where: { id: 'installation' },
          create: {
            id: 'installation',
            platformName: dto.platformName,
            platformDomain: dto.platformDomain,
            serverIp: dto.serverIp,
            adminEmail: dto.adminEmail,
            authMethod: dto.authMethod as AuthMethod,
            dnsMode: dto.dnsMode ?? 'cloudflare_auto',
          },
          update: {
            platformName: dto.platformName,
            platformDomain: dto.platformDomain,
            serverIp: dto.serverIp,
            adminEmail: dto.adminEmail,
            authMethod: dto.authMethod as AuthMethod,
            dnsMode: dto.dnsMode ?? 'cloudflare_auto',
          },
        });

        await this.createAdminUser(dto, tx);

        await tx.installationSettingsVersion.create({
          data: {
            changedBy: 'system',
            reason: 'Initial platform configuration',
            snapshot: {
              platformName: dto.platformName,
              platformDomain: dto.platformDomain,
              serverIp: dto.serverIp,
              adminEmail: dto.adminEmail,
              authMethod: dto.authMethod,
              dnsMode: dto.dnsMode,
            } as Prisma.InputJsonValue,
            operationId: op.id,
          },
        });

        await tx.installationStatus.update({
          where: { id: 'installation' },
          data: { lifecycle: 'CONFIGURED', lastOperationId: op.id },
        });
      });

      this.events.emit('installation.lifecycle.operation.completed', null, { operationId: op.id, success: true });
      this.events.emit('installation.lifecycle.changed', null, { lifecycle: 'CONFIGURED' });

      return { operationId: op.id };

    } catch (err) {
      const failedStep = err instanceof InstallationStepError ? err.step : null;
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.error(`Installation configure failed at step '${failedStep}': ${msg}`);

      // Both DB writes in one short transaction — if either fails the whole block
      // rolls back so operation and lifecycle stay consistent.
      await this.prisma.$transaction([
        this.prisma.installationOperation.update({
          where: { id: operationId },
          data: {
            status: 'FAILED',
            failureReason: msg,
            currentStep: failedStep,
            completedAt: new Date(),
          },
        }),
        this.prisma.installationStatus.update({
          where: { id: 'installation' },
          data: { lifecycle: 'FAILED' },
        }),
      ]).catch(() => null);

      // Events only after DB is consistent
      this.events.emit('installation.lifecycle.operation.completed', null, { operationId, success: false, error: msg, failedStep });
      this.events.emit('installation.lifecycle.changed', null, { lifecycle: 'FAILED' });
      throw err;

    } finally {
      await this.redis.releaseLock(LOCK_KEY, lockToken);
    }
  }

  // ─── Admin user creation ───────────────────────────────────────────

  private async createAdminUser(
    dto: ConfigureInstallationDto,
    tx: Parameters<Parameters<typeof this.prisma.$transaction>[0]>[0] = this.prisma,
  ): Promise<void> {
    try {
      await tx.user.create({
        data: {
          email: dto.adminEmail,
          name: 'Platform Admin',
          role: Role.ADMIN,
          preferredAuthMethod: dto.authMethod as AuthMethod,
          mustChangePassword: dto.authMethod === 'MAGIC_CODE',
          passwordHash: dto.authMethod === 'PASSWORD' && dto.adminPassword
            ? bcrypt.hashSync(dto.adminPassword, 12)
            : null,
          credentials: dto.authMethod === 'PASSWORD' && dto.adminPassword
            ? {
                create: {
                  type: 'PASSWORD',
                  secretHash: bcrypt.hashSync(dto.adminPassword, 12),
                },
              }
            : dto.authMethod === 'MAGIC_CODE'
              ? {
                  create: {
                    type: 'MAGIC_CODE',
                    secretHash: '',
                  },
                }
              : undefined,
        },
      });
      this.logger.log(`Admin user ${dto.adminEmail} created with authMethod=${dto.authMethod}`);
    } catch (err) {
      // Unique constraint violation = admin already exists — idempotent, safe to ignore
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        this.logger.log(`Admin user ${dto.adminEmail} already exists — skipping`);
        return;
      }
      throw err;
    }
  }

  // ─── SSE stream for progress ─────────────────────────────────────

  async *streamProgress(operationId: string): AsyncGenerator<Record<string, unknown>, void, unknown> {
    const deadline = Date.now() + 10 * 60 * 1000;
    while (Date.now() < deadline) {
      const op = await this.prisma.installationOperation.findUnique({ where: { id: operationId } });
      if (!op) break;
      yield {
        type: 'status',
        status: op.status,
        currentStep: op.currentStep,
        steps: op.steps,
        failureReason: op.failureReason,
      };
      if (op.status === 'COMPLETED' || op.status === 'FAILED') break;
      await this.sleep(500);
    }
  }

  // ─── Step runner ─────────────────────────────────────────────────

  private async runSteps(dto: ConfigureInstallationDto): Promise<StepResult[]> {
    type StepEntry = {
      name: InstallationStep;
      validate: (i: Record<string, unknown>) => Promise<StepValidationIssue>;
      execute: (i: Record<string, unknown>) => Promise<StepResult>;
    };

    const steps: StepEntry[] = [
      {
        name: 'dns' as InstallationStep,
        validate: i => this.dnsStep.validate(i as { domain: string; serverIp?: string }),
        execute: i => this.dnsStep.execute(i as { domain: string }),
      },
      {
        name: 'proxy' as InstallationStep,
        validate: i => this.proxyStep.validate(i as { domain: string }),
        execute: i => this.proxyStep.execute(i as { domain: string }),
      },
      {
        name: 'certificate' as InstallationStep,
        validate: i => this.certificateStep.validate(i as { domain: string }),
        execute: i => this.certificateStep.execute(i as { domain: string }),
      },
      {
        name: 'email' as InstallationStep,
        validate: i => this.emailStep.validate(i as { adminEmail: string }),
        execute: i => this.emailStep.execute(i as { adminEmail: string }),
      },
      {
        name: 'health' as InstallationStep,
        validate: () => this.healthStep.validate(),
        execute: () => this.healthStep.execute(),
      },
    ] as const;

    // Runtime assertion: step names must match INSTALLATION_STEPS order exactly.
    // This ensures adding a new step requires updating INSTALLATION_STEPS.
    steps.forEach((s, i) => {
      if (s.name !== INSTALLATION_STEPS[i]) {
        throw new Error(`Step order mismatch at index ${i}: steps has '${s.name}', INSTALLATION_STEPS has '${INSTALLATION_STEPS[i]}'`);
      }
    });

    const inputs: Record<string, unknown>[] = [
      { domain: dto.platformDomain, serverIp: dto.serverIp },
      { domain: dto.platformDomain },
      { domain: dto.platformDomain },
      { adminEmail: dto.adminEmail },
      {},
    ];

    const results: StepResult[] = [];

    for (let i = 0; i < steps.length; i++) {
      const { name, validate, execute } = steps[i];
      const input = inputs[i];

      this.events.emit(`installation.step.${name}.started`, null, { input });
      this.events.emit('installation.lifecycle.validation.started', null, { step: name });

      const validation = await validate(input);
      this.events.emit(`installation.step.${name}.validation.completed`, null, validation);
      this.events.emit('installation.lifecycle.validation.completed', null, { step: name, valid: validation.valid, issues: validation.issues });

      if (!validation.valid) {
        const error = `Validation failed for step ${name}: ${validation.issues.join(', ')}`;
        this.events.emit(`installation.step.${name}.failed`, null, { reason: error });
        throw new InstallationStepError(name, error);
      }

      const result = await execute(input);
      const eventName = result.success ? `installation.step.${name}.completed` : `installation.step.${name}.failed`;
      this.events.emit(eventName as EventType, null, result, {});

      if (!result.success) {
        throw new InstallationStepError(name, `Step ${name} failed: ${result.error}`);
      }

      results.push(result);
    }

    return results;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(r => setTimeout(r, ms));
  }
}
