import { Injectable } from '@nestjs/common';
import type { Project } from '@prisma/client';
import { PrismaService } from '@/prisma/prisma.service';
import { PlatformMailService } from '@/modules/email/platform-mail.service';
import { ProjectHealthChecker, ServiceHealth, unknownHealth, withTimeout } from '../types';

/**
 * Email, in its two truths: the platform's own mail service is reachable,
 * and the project's domain is actually verified.
 *
 * Reachability is the SMTP probe `PlatformMailService.check()` — the same
 * one behind `GET /health/email` — so the two answers cannot disagree. It
 * is shared and short-lived: a fresh probe at most once a minute, and only
 * for projects that use mail at all.
 */
@Injectable()
export class EmailHealthChecker implements ProjectHealthChecker {
  readonly service = 'email' as const;
  readonly link = '/email';

  private probeCache: { at: number; up: boolean } | null = null;
  private static readonly PROBE_TTL_MS = 60_000;

  constructor(
    private prisma: PrismaService,
    private mail: PlatformMailService,
  ) {}

  async check(project: Project): Promise<ServiceHealth> {
    const emailDomain = await this.prisma.emailDomain.findFirst({
      where: { projectId: project.id },
    });
    if (!emailDomain) {
      return this.base('not_configured', 'The project has no mail domain.');
    }

    // Is the mail service itself up? A verified domain over a dead service
    // is still broken, so this is asked first and is the louder truth.
    const up = await this.mailUp();
    if (up === null) {
      // The probe could not run: the service's state is not knowable.
      return unknownHealth(this, 'The mail service could not be probed.');
    }
    if (!up) {
      return this.base('unhealthy', 'The platform mail service is not reachable.', {
        lastFailureAt: new Date(),
      });
    }

    // The service is up: the verdict is the domain's own verification.
    switch (emailDomain.status) {
      case 'ACTIVE':
      case 'VERIFIED':
        return this.base('healthy', undefined, {
          lastGoodAt: emailDomain.verifiedAt ?? emailDomain.createdAt,
        });
      case 'FAILED':
        return this.base('unhealthy', 'Mail domain verification failed.', {
          lastGoodAt: emailDomain.verifiedAt,
          lastFailureAt: new Date(),
        });
      case 'PENDING':
      default:
        return this.base(
          'degraded',
          'Mail is configured but its DNS records have not all verified yet.',
          { lastGoodAt: emailDomain.verifiedAt },
        );
    }
  }

  /** `true`/`false` from the shared probe, or `null` when it could not run. */
  private async mailUp(): Promise<boolean | null> {
    if (this.probeCache && Date.now() - this.probeCache.at < EmailHealthChecker.PROBE_TTL_MS) {
      return this.probeCache.up;
    }
    try {
      const result = await withTimeout(this.mail.check(), 5000, 'mail probe');
      this.probeCache = { at: Date.now(), up: result.status === 'up' };
      return result.status === 'up';
    } catch {
      // A thrown probe is an infrastructure failure of the check itself.
      if (this.probeCache) return this.probeCache.up; // last known, honestly labelled
      return null;
    }
  }

  private base(
    state: ServiceHealth['state'],
    reason?: string,
    times?: { lastGoodAt?: Date | null; lastFailureAt?: Date | null },
  ): ServiceHealth {
    return {
      service: this.service,
      configured: state !== 'not_configured',
      state,
      reason,
      lastGoodAt: times?.lastGoodAt ? times.lastGoodAt.toISOString() : null,
      lastFailureAt: times?.lastFailureAt ? times.lastFailureAt.toISOString() : null,
      link: this.link,
    };
  }
}
