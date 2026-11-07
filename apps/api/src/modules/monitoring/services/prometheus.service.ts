import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '@/prisma/prisma.service';
import * as fs from 'fs';
import * as crypto from 'crypto';

/**
 * Phase 14 — Prometheus text exposition.
 *
 * Serializes platform + per-project metrics in the standard Prometheus text
 * format (https://prometheus.io/docs/instrumenting/exposition_formats/). Served
 * at GET /metrics (excluded from the api/v1 prefix). Platform-level series:
 * fidscript_up, fidscript_alerts_firing. Per-project: the latest value of each
 * recorded metric (fidscript_metric_value{project,metric}).
 *
 * **The per-project series name every project**, so the endpoint is not a
 * public probe: it is a list of the platform's projects and their metrics,
 * to anyone on the internet. The scrape therefore carries a token — the one
 * the observability add-on generates and Prometheus presents.
 */
@Injectable()
export class PrometheusService {
  private readonly logger = new Logger(PrometheusService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  /**
   * Check the scrape token.
   *
   * Without a token configured the platform serves only its own metrics —
   * there is no per-project series to leak — so monitoring keeps working on
   * a platform that has no observability add-on.
   *
   * Returns whether the caller may see the per-project series.
   */
  assertScrapeAuthorized(authorization?: string): boolean {
    const expected = this.scrapeToken();
    // No token configured: the per-project series are not served at all, so
    // there is nothing to disclose.
    if (!expected) return false;
    const presented = String(authorization ?? '').replace(/^Bearer\s+/i, '');
    if (!presented) {
      throw new UnauthorizedException('The metrics endpoint requires a scrape token');
    }
    const a = Buffer.from(presented);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
      throw new UnauthorizedException('Invalid scrape token');
    }
    return true;
  }

  /** Whether the platform has a per-project series to serve at all. */
  async hasProjectMetrics(): Promise<boolean> {
    const count = await this.prisma.metric.count();
    return count > 0;
  }

  async exposition(includeProjects: boolean): Promise<string> {
    const out: string[] = [];

    out.push('# HELP fidscript_up Platform API health (1 = up).');
    out.push('# TYPE fidscript_up gauge');
    out.push('fidscript_up 1');

    const firing = await this.prisma.alert.count({ where: { status: 'firing' } });
    out.push('# HELP fidscript_alerts_firing Number of alerts currently firing.');
    out.push('# TYPE fidscript_alerts_firing gauge');
    out.push(`fidscript_alerts_firing ${firing}`);

    if (!includeProjects) return out.join('\n') + '\n';

    out.push('# HELP fidscript_metric_value Last recorded value for a project metric.');
    out.push('# TYPE fidscript_metric_value gauge');
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const projects = await this.prisma.project.findMany({ select: { id: true, slug: true } });
    for (const project of projects) {
      const latest = await this.prisma.metric.findMany({
        where: { projectId: project.id, timestamp: { gte: since } },
        orderBy: { timestamp: 'desc' },
        distinct: ['metric'],
        take: 50,
      });
      for (const m of latest) {
        out.push(
          `fidscript_metric_value{project="${esc(project.slug)}",metric="${esc(m.metric)}"} ${m.value}`,
        );
      }
    }
    return out.join('\n') + '\n';
  }

  /** The token the scrape must present, from the environment or the file. */
  private scrapeToken(): string {
    const fromEnv = this.config.get<string>('OBSERVABILITY_PROMETHEUS_TOKEN', '');
    if (fromEnv) return fromEnv.trim();
    const file = this.config.get<string>(
      'OBSERVABILITY_PROMETHEUS_TOKEN_FILE',
      '/run/secrets/observability_prometheus_token',
    );
    try {
      if (!fs.existsSync(file)) return '';
      return fs.readFileSync(file, 'utf8').trim();
    } catch {
      return '';
    }
  }
}

/** Escape a Prometheus label value (escape backslash, double-quote, newline). */
function esc(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n');
}
