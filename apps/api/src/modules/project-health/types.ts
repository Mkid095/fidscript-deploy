/**
 * The shared vocabulary of project health.
 *
 * Five states, and the rule that keeps them honest: an unconfigured
 * service is *not* unhealthy, and a check that could not finish is
 * *unknown* — never quietly healthy.
 */
import type { Project } from '@prisma/client';

export type HealthServiceName =
  | 'deployment'
  | 'database'
  | 'instantdb'
  | 'domains'
  | 'email'
  | 'cron'
  | 'functions'
  | 'storage';

export type ServiceState =
  | 'healthy'
  | 'degraded'
  | 'unhealthy'
  | 'not_configured'
  | 'unknown';

/** The console screen a failed service links to (under /projects/:id). */
export interface ServiceHealth {
  service: HealthServiceName;
  configured: boolean;
  state: ServiceState;
  /** A human reason, free of credentials and connection strings. */
  reason?: string;
  lastGoodAt?: string | null;
  lastFailureAt?: string | null;
  link: string;
}

export interface ProjectHealthReport {
  projectId: string;
  checkedAt: string;
  /** The worst state of any configured service. */
  overall: 'healthy' | 'degraded' | 'unhealthy';
  services: ServiceHealth[];
}

/**
 * One line of the report, owned by one checker. A checker reads its
 * service's source of truth; the orchestrator bounds it and rolls it up.
 */
export interface ProjectHealthChecker {
  readonly service: HealthServiceName;
  readonly link: string;
  check(project: Project): Promise<ServiceHealth>;
}

/** A checker that could not finish. Unknown — not healthy, not an incident. */
export function unknownHealth(checker: ProjectHealthChecker, reason: string): ServiceHealth {
  return {
    service: checker.service,
    configured: true,
    state: 'unknown',
    reason,
    lastGoodAt: null,
    lastFailureAt: null,
    link: checker.link,
  };
}

/** The roll-up: worst of the configured services. Not-configured is out. */
const SEVERITY: Record<ServiceState, number> = {
  unhealthy: 3,
  degraded: 2,
  unknown: 1,
  not_configured: 0, // excluded from the roll-up
  healthy: 0,
};

export function rollUp(services: ServiceHealth[]): 'healthy' | 'degraded' | 'unhealthy' {
  let worst = 0;
  for (const s of services) {
    if (!s.configured) continue;
    worst = Math.max(worst, SEVERITY[s.state]);
  }
  if (worst >= 3) return 'unhealthy';
  if (worst >= 1) return 'degraded'; // unknown and degraded both read as degraded
  return 'healthy';
}

/** Bound a probe; a probe that runs past its cap is a failure, not a hang. */
export function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      },
    );
  });
}
