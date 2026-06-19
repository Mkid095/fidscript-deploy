import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';

/**
 * Phase 14 — Prometheus text exposition.
 *
 * Serializes platform + per-project metrics in the standard Prometheus text
 * format (https://prometheus.io/docs/instrumenting/exposition_formats/). Served
 * at GET /metrics (excluded from the api/v1 prefix). Platform-level series:
 * fidscript_up, fidscript_alerts_firing. Per-project: the latest value of each
 * recorded metric (fidscript_metric_value{project,metric}).
 */
@Injectable()
export class PrometheusService {
  constructor(private readonly prisma: PrismaService) {}

  async exposition(): Promise<string> {
    const out: string[] = [];

    out.push('# HELP fidscript_up Platform API health (1 = up).');
    out.push('# TYPE fidscript_up gauge');
    out.push('fidscript_up 1');

    const firing = await this.prisma.alert.count({ where: { status: 'firing' } });
    out.push('# HELP fidscript_alerts_firing Number of alerts currently firing.');
    out.push('# TYPE fidscript_alerts_firing gauge');
    out.push(`fidscript_alerts_firing ${firing}`);

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
}

/** Escape a Prometheus label value (escape backslash, double-quote, newline). */
function esc(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n');
}
