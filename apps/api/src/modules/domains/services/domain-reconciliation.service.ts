import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { EventService } from '@/modules/events/event.service';
import { DomainChecksService } from './domain-checks.service';

type HealthStatus = 'PENDING' | 'HEALTHY' | 'DEGRADED' | 'FAILED';
type VerificationReason = 'scheduled' | 'manual' | 'health_change' | 'ssl_expiry' | 'dns_change';

interface ReconciliationResult {
  domainId: string;
  score: number;
  breakdown: { dns: number; ssl: number; email: number; routing: number };
  status: HealthStatus;
  checks: { dnsOk: boolean; sslOk: boolean; emailOk: boolean; routingOk: boolean };
  errors: string[];
}

/**
 * DomainReconciliationService
 *
 * Core verification pipeline that:
 * - Runs DNS, SSL, Email, and Routing checks
 * - Computes weighted health score (DNS 30 + SSL 30 + Email 20 + Routing 20 = 100)
 * - Persists the health check result + updates domain state
 * - Emits domain lifecycle events
 * - Schedules the next verification based on health state
 *
 * Cadence:
 *   - PENDING/FAILED  domains → every 1 minute
 *   - DEGRADED        domains → every 5 minutes
 *   - HEALTHY         domains → every 15 minutes
 */
@Injectable()
export class DomainReconciliationService {
  private readonly logger = new Logger(DomainReconciliationService.name);

  constructor(
    private prisma: PrismaService,
    private eventService: EventService,
    private checks: DomainChecksService,
  ) {}

  // ── Public entry point ──────────────────────────────────────────────────────

  /**
   * Run the full reconciliation pipeline for a single domain.
   * Called by DomainReconciliationWorker (async queue consumer).
   */
  async reconcile(domainId: string, reason: VerificationReason): Promise<ReconciliationResult> {
    const domain = await this.prisma.domain.findUnique({
      where: { id: domainId },
      include: { deployment: { select: { deploymentUrl: true } } },
    });
    if (!domain) {
      throw new Error(`Domain ${domainId} not found`);
    }

    await this.emit(domainId, domain.projectId, 'domains.verification.started', {
      domain: domain.domain,
      reason,
    });

    const result = await this.runChecks(domain);
    await this.persistResult(domain, result);
    await this.updateDomainState(domain, result, reason);
    await this.scheduleNext(domain, result);

    return result;
  }

  // ── Check pipeline ───────────────────────────────────────────────────────────

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private async runChecks(domain: any): Promise<ReconciliationResult> {
    const errors: string[] = [];
    let dnsOk = false;
    let routingOk = false;
    let sslOk = false;
    let emailOk = false;
    let sslExpiresInDays: number | null = null;
    const start = Date.now();

    try {
      const [dns, routing, ssl, sslExp, email] = await Promise.all([
        this.checks.checkDnsPropagation(domain as any),
        this.checks.checkHttpRouting(domain as any),
        this.checks.checkSsl(domain as any),
        this.checks.getSslExpiresInDays(domain as any),
        this.checks.checkEmailRecords(domain as any),
      ]);
      dnsOk = dns;
      routingOk = routing;
      sslOk = ssl;
      sslExpiresInDays = sslExp;
      emailOk = email;
    } catch (err) {
      errors.push(err instanceof Error ? err.message : String(err));
    }

    const responseTimeMs = Date.now() - start;

    // Weighted score: DNS 30 + SSL 30 + Email 20 + Routing 20 = 100
    const breakdown = {
      dns: dnsOk ? 30 : 0,
      ssl: sslOk ? 30 : 0,
      email: emailOk ? 20 : 0,
      routing: routingOk ? 20 : 0,
    };
    const score = breakdown.dns + breakdown.ssl + breakdown.email + breakdown.routing;

    const status: HealthStatus = this.deriveStatus(score, dnsOk, routingOk, sslOk);

    // Write health check record
    await this.prisma.domainHealthCheck.create({
      data: {
        domainId: domain.id,
        dnsOk,
        routingOk,
        sslOk,
        emailOk,
        score,
        breakdown,
        responseTimeMs,
        sslExpiresInDays,
        status: status === 'HEALTHY' ? 'ok' : status === 'DEGRADED' ? 'degraded' : 'broken',
      },
    });

    // Update SSL tracking fields
    await this.prisma.domain.update({
      where: { id: domain.id },
      data: {
        sslLastCheckedAt: new Date(),
        sslExpiresAt: sslExpiresInDays != null
          ? new Date(Date.now() + sslExpiresInDays * 86_400_000)
          : undefined,
        sslLastError: sslOk ? null : (errors[0] ?? 'SSL check failed'),
      },
    });

    return { domainId: domain.id, score, breakdown, status, checks: { dnsOk, sslOk, emailOk, routingOk }, errors };
  }

  private deriveStatus(score: number, dnsOk: boolean, routingOk: boolean, sslOk: boolean): HealthStatus {
    if (!dnsOk || !routingOk) return 'FAILED';
    if (score >= 80) return 'HEALTHY';
    if (score >= 50) return 'DEGRADED';
    return 'FAILED';
  }

  // ── State persistence ────────────────────────────────────────────────────────

  private async persistResult(domain: { id: string; domain: string; projectId: string }, result: ReconciliationResult) {
    // Update domain with latest health tracking fields
    await this.prisma.domain.update({
      where: { id: domain.id },
      data: {
        healthStatus: result.status as any,
        lastVerifiedAt: new Date(),
        lastHealthScore: result.score,
        verificationFailures: result.status === 'FAILED'
          ? { increment: 1 }
          : 0,
      },
    });
  }

  private async updateDomainState(
    domain: { id: string; domain: string; projectId: string; dnsStatus: string; sslStatus: string },
    result: ReconciliationResult,
    reason: VerificationReason,
  ) {
    const { dnsStatus, sslStatus } = domain;
    const { checks } = result;

    // SSL expiry alert: 30, 14, 7, 3, 1 days
    // (check logic lives in scheduler; we just emit the event here)

    // Transition: TLS_PENDING → ACTIVE when SSL is confirmed
    if (checks.sslOk && sslStatus === 'TLS_PENDING') {
      await this.prisma.domain.update({
        where: { id: domain.id },
        data: { dnsStatus: 'ACTIVE', sslStatus: 'ACTIVE', sslIssuedAt: new Date() },
      });
      await this.emit(domain.id, domain.projectId, 'domains.verified', {
        domain: domain.domain,
        score: result.score,
      });
      this.logger.log(`[domain-recon] Domain ${domain.domain} verified (ACTIVE)`);
      return;
    }

    // Transition: ACTIVE → BROKEN when routing fails
    if (!checks.routingOk && dnsStatus === 'ACTIVE') {
      await this.prisma.domain.update({
        where: { id: domain.id },
        data: { dnsStatus: 'BROKEN' },
      });
      await this.emit(domain.id, domain.projectId, 'domains.health_changed', {
        domain: domain.domain,
        status: 'broken',
        score: result.score,
        reason,
      });
      this.logger.warn(`[domain-recon] Domain ${domain.domain} went BROKEN`);
      return;
    }

    // Transition: BROKEN → ACTIVE when recovered
    if (checks.routingOk && checks.sslOk && dnsStatus === 'BROKEN') {
      await this.prisma.domain.update({
        where: { id: domain.id },
        data: { dnsStatus: 'ACTIVE' },
      });
      await this.emit(domain.id, domain.projectId, 'domains.recovered', {
        domain: domain.domain,
        score: result.score,
      });
      this.logger.log(`[domain-recon] Domain ${domain.domain} recovered to ACTIVE`);
      return;
    }

    // Generic health_changed event for score/status transitions
    await this.emit(domain.id, domain.projectId, 'domains.health_changed', {
      domain: domain.domain,
      status: result.status.toLowerCase(),
      score: result.score,
      breakdown: result.breakdown,
      reason,
    });
  }

  // ── Next-verification scheduling ─────────────────────────────────────────────

  /**
   * Set nextVerificationAt based on health state:
   * - FAILED/PENDING → 1 minute
   * - DEGRADED       → 5 minutes
   * - HEALTHY        → 15 minutes
   */
  private async scheduleNext(domain: { id: string }, result: ReconciliationResult) {
    const minutes = result.status === 'HEALTHY' ? 15 : result.status === 'DEGRADED' ? 5 : 1;
    await this.prisma.domain.update({
      where: { id: domain.id },
      data: { nextVerificationAt: new Date(Date.now() + minutes * 60 * 1000) },
    });
  }

  // ── SSL expiry alerts ────────────────────────────────────────────────────────

  /**
   * Called by the scheduler to check all domains with certs expiring soon.
   * Returns domains with their days-until-expiry for alert generation.
   */
  async getSslExpiringDomains(daysThreshold: number[]) {
    const now = new Date();
    return this.prisma.domain.findMany({
      where: {
        sslExpiresAt: { not: null },
        sslStatus: 'ACTIVE',
      },
      select: {
        id: true,
        domain: true,
        projectId: true,
        sslExpiresAt: true,
      },
    }).then(domains => {
      return domains.filter(d => {
        if (!d.sslExpiresAt) return false;
        const daysLeft = Math.ceil((d.sslExpiresAt.getTime() - now.getTime()) / 86_400_000);
        return daysThreshold.includes(daysLeft);
      }).map(d => ({
        ...d,
        daysLeft: Math.ceil((d.sslExpiresAt!.getTime() - now.getTime()) / 86_400_000),
      }));
    });
  }

  // ── Event helper ─────────────────────────────────────────────────────────────

  private async emit(domainId: string, projectId: string, type: string, payload: Record<string, unknown>) {
    this.eventService.emit(type as any, projectId, { domainId, ...payload }, {
      actorType: 'system',
      resourceType: 'domain',
      resourceId: domainId,
    });
  }
}
