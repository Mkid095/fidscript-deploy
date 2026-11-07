import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrometheusService } from './prometheus.service';

/**
 * The metrics endpoint, tested.
 *
 * The per-project series name every project, so they are not served to a
 * caller that has not presented the scrape token. The platform's own series
 * stay open — they say nothing about anybody's work.
 */

const TOKEN = 'the-scrape-token';

function makeService(options: { env?: string; file?: string | null } = {}) {
  const prisma = {
    metric: { count: jest.fn(async () => 0), findMany: jest.fn(async () => []) },
    alert: { count: jest.fn(async () => 0) },
    project: { findMany: jest.fn(async () => []) },
  };
  const config = {
    get: jest.fn((key: string, fallback: string) => {
      if (key === 'OBSERVABILITY_PROMETHEUS_TOKEN') return options.env ?? '';
      if (key === 'OBSERVABILITY_PROMETHEUS_TOKEN_FILE') return '/run/secrets/observability_prometheus_token';
      return fallback;
    }),
  } as unknown as ConfigService;

  const fs = require('fs');
  jest.spyOn(fs, 'existsSync').mockReturnValue(options.file !== null);
  jest.spyOn(fs, 'readFileSync').mockReturnValue(options.file ?? TOKEN);

  return new PrometheusService(prisma as any, config);
}

describe('the metrics endpoint', () => {
  afterEach(() => jest.restoreAllMocks());

  it('refuses a scrape with no token when one is configured', () => {
    const service = makeService({ env: TOKEN });
    expect(() => service.assertScrapeAuthorized(undefined)).toThrow(UnauthorizedException);
  });

  it('refuses a scrape with the wrong token', () => {
    const service = makeService({ env: TOKEN });
    expect(() => service.assertScrapeAuthorized('Bearer wrong')).toThrow(UnauthorizedException);
  });

  it('accepts a scrape with the token', () => {
    const service = makeService({ env: TOKEN });
    expect(service.assertScrapeAuthorized(`Bearer ${TOKEN}`)).toBe(true);
  });

  it('reads the token from the file the add-on generated', () => {
    const service = makeService({ file: TOKEN });
    expect(service.assertScrapeAuthorized(`Bearer ${TOKEN}`)).toBe(true);
  });

  it('serves the platform series when no token is configured at all', () => {
    const service = makeService({ env: '', file: null });
    expect(service.assertScrapeAuthorized(undefined)).toBe(false);
  });

  it('never names a project without the per-project series', async () => {
    const service = makeService({ env: '' });
    const exposition = await service.exposition(false);
    expect(exposition).toContain('fidscript_up 1');
    expect(exposition).not.toContain('project=');
  });
});
