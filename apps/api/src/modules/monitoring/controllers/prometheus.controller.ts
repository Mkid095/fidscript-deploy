import { Controller, Get, Header } from '@nestjs/common';
import { PrometheusService } from '../services/prometheus.service';

/**
 * Phase 14 — Prometheus scrape endpoint.
 *
 * Served at GET /metrics (this controller's path 'metrics' is excluded from the
 * api/v1 global prefix in main.ts). Returns Prometheus text exposition. Open
 * (no JWT) at the platform level; per-project token-gated scraping is a future
 * addition.
 */
@Controller('metrics')
export class PrometheusController {
  constructor(private readonly prometheus: PrometheusService) {}

  @Get()
  @Header('Content-Type', 'text/plain; version=0.0.4; charset=utf-8')
  async metrics(): Promise<string> {
    return this.prometheus.exposition();
  }
}
