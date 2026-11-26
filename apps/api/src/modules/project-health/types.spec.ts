import { rollUp, unknownHealth, withTimeout, ProjectHealthChecker, ServiceHealth } from './types';

/**
 * The vocabulary's honesty rules, pinned:
 * a probe failure is unknown, an unconfigured service is not unhealthy,
 * and the overall answer is the worst of what is actually configured.
 */

const checker = {
  service: 'database',
  link: '/databases',
  check: async () => null as never,
} as unknown as ProjectHealthChecker;

function svc(state: ServiceHealth['state'], configured = true): ServiceHealth {
  return {
    service: 'database',
    configured,
    state: state as ServiceHealth['state'],
    link: '/databases',
  };
}

describe('rollUp', () => {
  it('is the worst state of the configured services', () => {
    expect(rollUp([svc('healthy'), svc('healthy')])).toBe('healthy');
    expect(rollUp([svc('healthy'), svc('degraded')])).toBe('degraded');
    expect(rollUp([svc('degraded'), svc('unhealthy')])).toBe('unhealthy');
  });

  it('ignores not-configured services — an absent optional service never drags the project down', () => {
    expect(rollUp([svc('not_configured', false)])).toBe('healthy');
    expect(rollUp([svc('not_configured', false), svc('healthy')])).toBe('healthy');
  });

  it('treats a configured service that could not be checked as degraded, not healthy', () => {
    expect(rollUp([svc('healthy'), svc('unknown')])).toBe('degraded');
    expect(rollUp([svc('unknown')])).toBe('degraded');
  });

  it('lets a genuine failure beat everything else', () => {
    expect(rollUp([svc('unhealthy'), svc('healthy'), svc('not_configured', false)])).toBe('unhealthy');
  });
});

describe('unknownHealth', () => {
  it('is unknown, keeps the checker identity, and carries the service and link', () => {
    const h = unknownHealth(checker, 'The probe did not finish.');
    expect(h.state).toBe('unknown');
    expect(h.configured).toBe(true);
    expect(h.service).toBe('database');
    expect(h.reason).toBe('The probe did not finish.');
  });
});

describe('withTimeout', () => {
  it('resolves when the probe finishes in time', async () => {
    await expect(withTimeout(Promise.resolve(7), 50, 'probe')).resolves.toBe(7);
  });

  it('rejects when the probe runs past its cap', async () => {
    await expect(withTimeout(new Promise(() => {}), 20, 'probe')).rejects.toThrow(
      'probe timed out',
    );
  }, 5000);
});
