import { Controller, Get, Header, Headers, UnauthorizedException } from '@nestjs/common';
import { PrometheusService } from '../services/prometheus.service';
import { Public } from '@/modules/auth/decorators/public.decorator';

/**
 * Phase 14 — Prometheus scrape endpoint.
 *
 * Served at GET /metrics (this controller's path 'metrics' is excluded from the
 * api/v1 global prefix in main.ts).
 *
 * The platform's own metrics are open; the **per-project series name every
 * project**, so they are served only to a scrape that presents the token the
 * observability add-on generated. A platform with no such token serves the
 * platform metrics alone — there is nothing to leak.
 */
@Controller('metrics')
export class PrometheusController {
  constructor(private readonly prometheus: PrometheusService) {}

  @Get()
  @Public()
  @Header('Content-Type', 'text/plain; version=0.0.4; charset=utf-8')
  async metrics(@Headers('authorization') authorization?: string): Promise<string> {
    const authorized = this.prometheus.assertScrapeAuthorized(authorization);
    const includeProjects = authorized && (await this.prometheus.hasProjectMetrics());
    // With no per-project metrics recorded there is nothing to disclose, and
    // the platform's own series stay readable.
    return this.prometheus.exposition(includeProjects);
  }
}
