import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { EventService } from '@/modules/events/event.service';
import { DomainChecksService } from './domain-checks.service';
import { VerificationReason } from './domain-reconciliation-queue.service';
import { createHash } from 'crypto';

type HealthStatus = 'PENDING' | 'HEALTHY' | 'DEGRADED' | 'FAILED';

interface ReconciliationResult {
  domainId: string;
  score: number;
  breakdown: { dns: number; ssl: number; email: number; routing: number };
  status: HealthStatus;
  checks: { dnsOk: boolean; sslOk: boolean; emailOk: boolean; routingOk: boolean };
  errors: string[];
  durationMs: number;
  previousStatus: HealthStatus | null;
  previousScore: number | null;
}

interface FingerprintResult {
  fingerprint: string;
  changed: boolean;
}

/**
 * DomainReconciliationService
 *
 * Core verification pipeline that:
 * - Runs DNS, SSL, Email, and Routing checks
 * - Computes weighted health score (DNS 30 + SSL 30 + Email 20 + Routing 20 = 100)
 * - Persists the health check result + updates domain state
 * - Records every run to DomainVerificationRun (audit trail)
 * - Detects DNS fingerprint changes
 * - Manages DomainIncident lifecycle (opens on failure, resolves on recovery)
 * - Emits domain lifecycle events
 * - Schedules the next verification based on health state, priority, and domain age
 *
 * Cadence (adaptive):
 *   Priority 3 (critical)   → every 1 minute  regardless of health
 *   Priority 2 (production) → every 5 minutes  (healthy), 1 minute (degraded/failed)
 *   Priority 1 (important) → every 10 minutes (healthy), 5 minutes (degraded/failed)
 *   Priority 0 (normal)    → every 15 minutes (healthy), 5 minutes (degraded), 1 minute (failed)
 *
 *   Age-based multiplier: domain > 90 days → multiply interval by 2
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

  async reconcile(domainId: string, reason: VerificationReason): Promise<ReconciliationResult> {
    const domain = await this.prisma.domain.findUnique({
      where: { id: domainId },
      include: { deployment: { select: { deploymentUrl: true } } },
    });
    if (!domain) throw new Error(`Domain ${domainId} not found`);

    const start = Date.now();
    const previousStatus = (domain.healthStatus ?? 'PENDING') as HealthStatus;
    const previousScore = domain.lastHealthScore ?? null;

    await this.emit(domainId, domain.projectId, 'domains.verification.started', {
      domain: domain.domain,
      reason,
    });

    // DNS fingerprint check (before running checks)
    const fingerprintResult = await this.detectDnsFingerprint(domain);

    // Run the full check pipeline
    const result = await this.runChecks(domain);

    const durationMs = Date.now() - start;

    // Persist all outcomes
    await this.recordRun(domain, { ...result, durationMs, previousStatus, previousScore, reason });
    await this.persistHealthResult(domain, result);
    await this.manageIncidents(domain, result, previousStatus);
    await this.updateDomainState(domain, result, reason, fingerprintResult.changed);
    await this.scheduleNext(domain, result);

    return { ...result, durationMs, previousStatus, previousScore };
  }

  // ── DNS fingerprinting ───────────────────────────────────────────────────────

  /**
   * Compute a SHA-256 fingerprint of the domain's current DNS records.
   * Compares against lastDnsFingerprint to detect changes.
   */
  async computeDnsFingerprint(domainId: string): Promise<string> {
    const records = await this.checks.getDnsRecordsForFingerprint(domainId as any);
    const normalized = JSON.stringify(records.sort((a, b) => a.type.localeCompare(b.type)));
    return createHash('sha256').update(normalized).digest('hex');
  }

  private async detectDnsFingerprint(domain: { id: string; lastDnsFingerprint: string | null }) {
    const current = await this.computeDnsFingerprint(domain.id);
    const changed = !!domain.lastDnsFingerprint && current !== domain.lastDnsFingerprint;
    return { fingerprint: current, changed };
  }

  // ── Check pipeline ───────────────────────────────────────────────────────────

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private async runChecks(domain: any): Promise<Omit<ReconciliationResult, 'durationMs' | 'previousStatus' | 'previousScore'>> {
    const errors: string[] = [];
    let dnsOk = false;
    let routingOk = false;
    let sslOk = false;
    let emailOk = false;
    let sslExpiresInDays: number | null = null;
    const start = Date.now();

    try {
      const [dns, routing, ssl, sslExp, email] = await Promise.all([
        this.checks.checkDnsPropagation(domain),
        this.checks.checkHttpRouting(domain),
        this.checks.checkSsl(domain),
        this.checks.getSslExpiresInDays(domain),
        this.checks.checkEmailRecords(domain),
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

    const breakdown = {
      dns: dnsOk ? 30 : 0,
      ssl: sslOk ? 30 : 0,
      email: emailOk ? 20 : 0,
      routing: routingOk ? 20 : 0,
    };
    const score = breakdown.dns + breakdown.ssl + breakdown.email + breakdown.routing;
    const status = this.deriveStatus(score, dnsOk, routingOk, sslOk);

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

    // Update SSL tracking
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

  // ── Verification run audit record ────────────────────────────────────────────

  private async recordRun(
    domain: { id: string },
    result: Omit<ReconciliationResult, 'previousStatus' | 'previousScore'> & {
      previousStatus: HealthStatus | null;
      previousScore: number | null;
      reason: VerificationReason;
    },
  ) {
    await this.prisma.domainVerificationRun.create({
      data: {
        domainId: domain.id,
        reason: result.reason,
        previousStatus: result.previousStatus as any,
        newStatus: result.status as any,
        previousScore: result.previousScore,
        newScore: result.score,
        durationMs: result.durationMs,
        checks: {
          dnsOk: result.checks.dnsOk,
          sslOk: result.checks.sslOk,
          emailOk: result.checks.emailOk,
          routingOk: result.checks.routingOk,
          responseTimeMs: result.durationMs,
        },
        error: result.errors[0] ?? null,
      },
    });
  }

  // ── Health result ───────────────────────────────────────────────────────────

  private async persistHealthResult(
    domain: { id: string },
    result: { status: HealthStatus; score: number; errors: string[] },
  ) {
    await this.prisma.domain.update({
      where: { id: domain.id },
      data: {
        healthStatus: result.status as any,
        lastVerifiedAt: new Date(),
        lastHealthScore: result.score,
        verificationFailures: result.status === 'FAILED' ? { increment: 1 } : 0,
      },
    });
  }

  // ── Incident management ─────────────────────────────────────────────────────

  private async manageIncidents(
    domain: { id: string; domain: string; projectId: string },
    result: { status: HealthStatus; score: number; checks: { dnsOk: boolean; sslOk: boolean; routingOk: boolean } },
    previousStatus: HealthStatus,
  ) {
    // Open incidents if domain just entered FAILED/DEGRADED
    if ((result.status === 'FAILED' || result.status === 'DEGRADED') && previousStatus !== result.status) {
      const incidentType = !result.checks.routingOk
        ? 'routing_failure'
        : !result.checks.dnsOk
        ? 'dns_missing'
        : !result.checks.sslOk
        ? 'ssl_expired'
        : 'mx_invalid';

      const severity = result.status === 'FAILED' ? 'critical' : 'warning';
      const title = result.status === 'FAILED'
        ? `${domain.domain}: ${incidentType.replace('_', ' ')}`
        : `${domain.domain}: degraded health (score ${result.score})`;

      await this.prisma.domainIncident.create({
        data: {
          domainId: domain.id,
          type: incidentType,
          severity,
          title,
          status: 'open',
        },
      });

      await this.emit(domain.id, domain.projectId, 'domains.incident.opened', {
        domain: domain.domain,
        type: incidentType,
        severity,
        title,
        status: result.status,
        score: result.score,
      });
    }

    // Resolve all open incidents if domain recovered to HEALTHY
    if (result.status === 'HEALTHY' && previousStatus !== 'HEALTHY') {
      const openIncidents = await this.prisma.domainIncident.findMany({
        where: { domainId: domain.id, status: 'open' },
      });

      await this.prisma.domainIncident.updateMany({
        where: { domainId: domain.id, status: 'open' },
        data: { status: 'resolved', resolvedAt: new Date() },
      });

      for (const incident of openIncidents) {
        await this.emit(domain.id, domain.projectId, 'domains.incident.resolved', {
          domain: domain.domain,
          type: incident.type,
          title: incident.title,
          openedAt: incident.openedAt.toISOString(),
          resolvedAt: new Date().toISOString(),
        });
      }
    }
  }

  // ── State transitions ───────────────────────────────────────────────────────

  private async updateDomainState(
    domain: { id: string; domain: string; projectId: string; dnsStatus: string; sslStatus: string },
    result: { status: HealthStatus; score: number; checks: { sslOk: boolean; routingOk: boolean } },
    reason: VerificationReason,
    dnsChanged: boolean,
  ) {
    const { checks } = result;

    // DNS fingerprint changed → emit event
    if (dnsChanged) {
      await this.emit(domain.id, domain.projectId, 'domains.dns.changed', {
        domain: domain.domain,
        reason,
      });
      this.logger.log(`[domain-recon] DNS fingerprint changed for ${domain.domain}`);
    }

    // TLS_PENDING → ACTIVE when SSL confirmed
    if (checks.sslOk && domain.sslStatus === 'TLS_PENDING') {
      await this.prisma.domain.update({
        where: { id: domain.id },
        data: { dnsStatus: 'ACTIVE', sslStatus: 'ACTIVE', sslIssuedAt: new Date() },
      });
      await this.emit(domain.id, domain.projectId, 'domains.verified', {
        domain: domain.domain,
        score: result.score,
      });
      this.logger.log(`[domain-recon] Domain ${domain.domain} reached ACTIVE`);
      return;
    }

    // ACTIVE → BROKEN
    if (!checks.routingOk && domain.dnsStatus === 'ACTIVE') {
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

    // BROKEN → ACTIVE (recovery)
    if (checks.routingOk && checks.sslOk && domain.dnsStatus === 'BROKEN') {
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

    // Generic health_changed
    await this.emit(domain.id, domain.projectId, 'domains.health_changed', {
      domain: domain.domain,
      status: result.status.toLowerCase(),
      score: result.score,
      reason,
    });
  }

  // ── Adaptive next-verification scheduling ────────────────────────────────────

  private async scheduleNext(
    domain: { id: string; createdAt: Date; priority: number; lastVerifiedAt: Date | null },
    result: { status: HealthStatus },
  ) {
    const minutes = this.getAdaptiveInterval(domain.priority, result.status, domain.createdAt);
    await this.prisma.domain.update({
      where: { id: domain.id },
      data: { nextVerificationAt: new Date(Date.now() + minutes * 60 * 1000) },
    });
  }

  /**
   * Adaptive interval in minutes based on priority, health status, and domain age.
   */
  getAdaptiveInterval(priority: number, status: HealthStatus, createdAt: Date): number {
    const ageDays = (Date.now() - createdAt.getTime()) / 86_400_000;
    const ageMultiplier = ageDays > 90 ? 2 : ageDays > 30 ? 1.5 : 1;

    if (priority >= 3) return 1; // critical — always 1 min

    if (status === 'HEALTHY') {
      const base = priority === 2 ? 5 : priority === 1 ? 10 : 15;
      return Math.round(base * ageMultiplier);
    }
    if (status === 'DEGRADED') {
      return priority >= 2 ? 1 : 5;
    }
    return 1; // FAILED — always 1 min
  }

  // ── SSL expiry ──────────────────────────────────────────────────────────────

  async getSslExpiringDomains(daysThreshold: number[]) {
    const now = new Date();
    const domains = await this.prisma.domain.findMany({
      where: { sslExpiresAt: { not: null }, sslStatus: 'ACTIVE' },
      select: { id: true, domain: true, projectId: true, sslExpiresAt: true },
    });

    return domains
      .filter(d => {
        if (!d.sslExpiresAt) return false;
        const daysLeft = Math.ceil((d.sslExpiresAt.getTime() - now.getTime()) / 86_400_000);
        return daysThreshold.includes(daysLeft);
      })
      .map(d => {
        const daysLeft = Math.ceil((d.sslExpiresAt!.getTime() - now.getTime()) / 86_400_000);
        return { ...d, daysLeft };
      });
  }

  // ── History queries (for analytics API) ─────────────────────────────────────

  async getVerificationHistory(domainId: string, limit = 50) {
    return this.prisma.domainVerificationRun.findMany({
      where: { domainId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  async getIncidents(domainId: string) {
    return this.prisma.domainIncident.findMany({
      where: { domainId },
      orderBy: { openedAt: 'desc' },
    });
  }

  async getHealthTimeline(domainId: string, days = 30) {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    return this.prisma.domainHealthCheck.findMany({
      where: { domainId, checkedAt: { gte: since } },
      orderBy: { checkedAt: 'asc' },
      select: {
        checkedAt: true,
        score: true,
        status: true,
        breakdown: true,
      },
    });
  }

  // ── Event helper ────────────────────────────────────────────────────────────

  private async emit(domainId: string, projectId: string, type: string, payload: Record<string, unknown>) {
    this.eventService.emit(type as any, projectId, { domainId, ...payload }, {
      actorType: 'system',
      resourceType: 'domain',
      resourceId: domainId,
    });
  }
}
