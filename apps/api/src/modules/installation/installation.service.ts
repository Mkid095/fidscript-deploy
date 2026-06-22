import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventService } from '@/modules/events/event.service';
import type { EventType } from '@fidscript/events';
import { RedisService } from '@/modules/redis/redis.service';
import { PrismaService } from '@/prisma/prisma.service';
import { DnsStep, ProxyStep, CertificateStep, EmailStep, HealthStep } from './steps/installation-steps';
import { InstallationStepError } from './installation.error';
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
      // Clean up any previous failed/running operation so retry is truly clean
      await this.prisma.installationOperation.updateMany({
        where: { status: { in: ['RUNNING', 'FAILED'] } },
        data: { status: 'ABANDONED' },
      });

      const prevSettings = await this.prisma.installationSettings.findFirst();
      const prevSnapshot: Prisma.InputJsonValue | undefined = prevSettings
        ? (JSON.parse(JSON.stringify(prevSettings)) as Prisma.InputJsonValue)
        : undefined;

      const op = await this.prisma.installationOperation.create({
        data: { type: 'CONFIGURE', status: 'RUNNING', previousSnapshot: prevSnapshot },
      });
      operationId = op.id;

      // Transition FAILED → CONFIGURING so middleware immediately reflects the retry in progress
      await this.prisma.installationStatus.upsert({
        where: { id: 'installation' },
        create: { id: 'installation', lifecycle: 'CONFIGURING', lastOperationId: op.id },
        update: { lifecycle: 'CONFIGURING', lastOperationId: op.id },
      });

      this.events.emit('installation.lifecycle.operation.started' as EventType, { operationId: op.id, type: 'CONFIGURE' });

      // 1. Write Cloudflare token to secrets dir so Traefik/other services can read it
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

      // 2. Run infrastructure steps (DNS, proxy, cert, email, health)
      const stepResults = await this.runSteps(dto);

      // 3. Update operation
      await this.prisma.installationOperation.update({
        where: { id: op.id },
        data: {
          status: 'COMPLETED',
          currentStep: null,
          steps: stepResults as unknown as Prisma.InputJsonValue,
          completedAt: new Date(),
        },
      });

      // 4. Save InstallationSettings
      await this.prisma.installationSettings.upsert({
        where: { id: 'installation' },
        create: {
          id: 'installation',
          platformName: dto.platformName,
          platformDomain: dto.platformDomain,
          serverIp: dto.serverIp,
          adminEmail: dto.adminEmail,
          authMethod: dto.authMethod as AuthMethod,
          dnsMode: dto.dnsMode ?? 'cloudflare_auto',
          // cloudflareApiToken is written to /run/secrets/cf_api_token — never stored in DB
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

      // 5. Create admin user with correct auth method
      await this.createAdminUser(dto);

      // 6. Audit trail — NEVER include secrets in the snapshot
      await this.prisma.installationSettingsVersion.create({
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
            // Intentionally excluded: adminPassword, cloudflareApiToken
          } as Prisma.InputJsonValue,
          operationId: op.id,
        },
      });

      // 7. Mark CONFIGURED
      await this.prisma.installationStatus.update({
        where: { id: 'installation' },
        data: { lifecycle: 'CONFIGURED', lastOperationId: op.id },
      });

      this.events.emit('installation.lifecycle.operation.completed' as EventType, { operationId: op.id, success: true });
      this.events.emit('installation.lifecycle.changed' as EventType, { lifecycle: 'CONFIGURED' });

      return { operationId: op.id };
    } catch (err) {
      // Structured error — step name is a typed field, not parsed from a string
      const failedStep = err instanceof InstallationStepError ? err.step : null;
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.error(`Installation configure failed at step '${failedStep}': ${msg}`);

      if (operationId) {
        await this.prisma.installationOperation.update({
          where: { id: operationId },
          data: {
            status: 'FAILED',
            failureReason: msg,
            currentStep: failedStep,
            completedAt: new Date(),
          },
        }).catch(() => null);
      }

      // Transition to FAILED so the UI shows a proper error state, not CONFIGURING forever
      await this.prisma.installationStatus.update({
        where: { id: 'installation' },
        data: { lifecycle: 'FAILED' },
      }).catch(() => null);
      this.events.emit('installation.lifecycle.operation.completed' as EventType, { operationId, success: false, error: msg, failedStep });
      this.events.emit('installation.lifecycle.changed' as EventType, { lifecycle: 'FAILED' });
      throw err;
    } finally {
      await this.redis.releaseLock(LOCK_KEY, lockToken);
    }
  }

  // ─── Admin user creation ───────────────────────────────────────────

  private async createAdminUser(dto: ConfigureInstallationDto): Promise<void> {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.adminEmail } });
    if (existing) {
      this.logger.log(`Admin user ${dto.adminEmail} already exists — skipping`);
      return;
    }

    const user = await this.prisma.user.create({
      data: {
        email: dto.adminEmail,
        name: 'Platform Admin',
        role: Role.ADMIN,
        preferredAuthMethod: dto.authMethod as AuthMethod,
        // Magic-code users must set a password on first login
        mustChangePassword: dto.authMethod === 'MAGIC_CODE',
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
                  secretHash: '', // filled in on first magic-code login
                },
              }
            : undefined,
      },
      include: { credentials: true },
    });

    this.logger.log(`Admin user ${dto.adminEmail} created with authMethod=${dto.authMethod}`);
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
      name: string;
      validate: (i: Record<string, unknown>) => Promise<StepValidationIssue>;
      execute: (i: Record<string, unknown>) => Promise<StepResult>;
    };

    const steps: StepEntry[] = [
      {
        name: 'dns',
        validate: i => this.dnsStep.validate(i as { domain: string; serverIp?: string }),
        execute: i => this.dnsStep.execute(i as { domain: string }),
      },
      {
        name: 'proxy',
        validate: i => this.proxyStep.validate(i as { domain: string }),
        execute: i => this.proxyStep.execute(i as { domain: string }),
      },
      {
        name: 'certificate',
        validate: i => this.certificateStep.validate(i as { domain: string }),
        execute: i => this.certificateStep.execute(i as { domain: string }),
      },
      {
        name: 'email',
        validate: i => this.emailStep.validate(i as { adminEmail: string }),
        execute: i => this.emailStep.execute(i as { adminEmail: string }),
      },
      {
        name: 'health',
        validate: () => this.healthStep.validate(),
        execute: () => this.healthStep.execute(),
      },
    ];

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

      this.events.emit(`installation.step.${name}.started` as EventType, { input });
      this.events.emit('installation.lifecycle.validation.started' as EventType, { step: name });

      const validation = await validate(input);
      this.events.emit(`installation.step.${name}.validation.completed` as EventType, validation);
      this.events.emit('installation.lifecycle.validation.completed' as EventType, { step: name, valid: validation.valid, issues: validation.issues });

      if (!validation.valid) {
        const error = `Validation failed for step ${name}: ${validation.issues.join(', ')}`;
        this.events.emit(`installation.step.${name}.failed` as EventType, { reason: error });
        throw new InstallationStepError(name, error);
      }

      const result = await execute(input);
      const eventName = result.success ? `installation.step.${name}.completed` : `installation.step.${name}.failed`;
      this.events.emit(eventName as EventType, result);

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
