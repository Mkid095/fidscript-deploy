import 'server-only';

import { getPlatformDomain } from './platform';

/**
 * What the machine is doing.
 *
 * The numbers come from Prometheus — the platform's own collector — and the
 * logs come from Loki. Neither is the console's business: it reads them
 * the same way it reads the API, over the network, and shows what they say.
 */

export interface Series {
  /** The name of the thing — a container, a machine. */
  name: string;
  /** The points, oldest first. */
  points: Array<{ at: number; value: number }>;
}

export interface Sample {
  name: string;
  value: number;
}

/**
 * The observability back-ends, read the way the API and the registry are:
 * over the shared network when the deployment says where they are, and
 * only through the public edge when it does not. The read goes through an
 * opaque alias so the internal addresses survive the build (a plain
 * `process.env.X ?? …` chain folds to the build-time literal).
 */
const env = process.env;

async function prometheusUrl(): Promise<string | null> {
  if (env.PROMETHEUS_INTERNAL_URL) return env.PROMETHEUS_INTERNAL_URL;
  const domain = await getPlatformDomain();
  return domain ? `https://prometheus.${domain}` : null;
}

async function lokiUrl(): Promise<string | null> {
  if (env.LOKI_INTERNAL_URL) return env.LOKI_INTERNAL_URL;
  const domain = await getPlatformDomain();
  return domain ? `https://loki.${domain}` : null;
}

/** One number, right now. */
async function query(expression: string): Promise<Sample[]> {
  const base = await prometheusUrl();
  if (!base) return [];

  try {
    const response = await fetch(
      `${base}/api/v1/query?query=${encodeURIComponent(expression)}`,
      { cache: 'no-store', signal: AbortSignal.timeout(8000) },
    );
    if (!response.ok) return [];

    const body = (await response.json()) as {
      data?: {
        result?: Array<{
          metric?: Record<string, string>;
          value?: [number, string];
        }>;
      };
    };

    return (body.data?.result ?? [])
      .map((entry) => ({
        name:
          entry.metric?.name ??
          entry.metric?.container ??
          entry.metric?.service ??
          'the platform',
        value: Number(entry.value?.[1] ?? 0),
      }))
      .filter((entry) => Number.isFinite(entry.value));
  } catch {
    return [];
  }
}

/** A line over time — one series per name. */
async function queryRange(
  expression: string,
  rangeMinutes = 60,
): Promise<Series[]> {
  const base = await prometheusUrl();
  if (!base) return [];

  const end = Math.floor(Date.now() / 1000);
  const start = end - rangeMinutes * 60;

  try {
    const response = await fetch(
      `${base}/api/v1/query_range?query=${encodeURIComponent(expression)}&start=${start}&end=${end}&step=${Math.max(60, Math.floor((rangeMinutes * 60) / 60))}`,
      { cache: 'no-store', signal: AbortSignal.timeout(10000) },
    );
    if (!response.ok) return [];

    const body = (await response.json()) as {
      data?: {
        result?: Array<{
          metric?: Record<string, string>;
          values?: Array<[number, string]>;
        }>;
      };
    };

    return (body.data?.result ?? []).map((entry) => ({
      name: entry.metric?.name ?? entry.metric?.container ?? 'the platform',
      points: (entry.values ?? []).map(([at, value]) => ({
        at,
        value: Number(value),
      })),
    }));
  } catch {
    return [];
  }
}

/**
 * What is running, and what each of it is using.
 *
 * The platform's API reads it from the Docker daemon — the same source the
 * deployment engine uses — so it is true even when a collector on the host
 * cannot see the containers.
 */
export interface ContainerStat {
  name: string;
  image: string;
  status: string;
  cpuPercent: number;
  memoryBytes: number;
  memoryPercent: number;
  networkBytes: number;
}

export interface SystemState {
  containers: ContainerStat[];
  disk: { used: number; total: number };
  at: string;
}

export async function getSystemState(): Promise<SystemState | null> {
  const { serverApi: api } = await import('./server');
  return api.get<SystemState>('/system/containers').catch(() => null);
}

/**
 * The deletion cleanups that have not finished: a failed one, with what
 * failed, or one still running past its stall window. Each can be retried
 * from the system screen.
 */
export interface DeletionTask {
  projectId: string;
  projectSlug: string | null;
  state: string;
  lastError: string | null;
  attempts: number;
  updatedAt: string;
}

export async function getDeletionTasks(): Promise<DeletionTask[]> {
  const { serverApi: api } = await import('./server');
  const res = await api
    .get<{ tasks: DeletionTask[] }>('/system/deletion-tasks')
    .catch(() => null);
  return res?.tasks ?? [];
}

/**
 * The machine's CPU, over the last hour.
 *
 * The collector sees the machine itself — the containers it cannot read are
 * the platform's own, and their numbers come from the Docker daemon.
 */
export async function getMachineCpu(rangeMinutes = 60): Promise<Series[]> {
  return queryRange(
    'rate(container_cpu_usage_seconds_total{cpu="total"}[5m])',
    rangeMinutes,
  );
}

/**
 * The machine's own totals.
 *
 * The collector on the host knows how many cores and how much memory the
 * machine has; what is *using* them comes from the containers.
 */
export async function getMachineState(): Promise<{
  cpuCores: number;
  memoryTotal: number;
  swapTotal: number;
}> {
  const [cores, memory, swap] = await Promise.all([
    query('machine_cpu_cores'),
    query('machine_memory_bytes'),
    query('machine_swap_bytes'),
  ]);

  const sum = (samples: Sample[]) =>
    samples.reduce((total, sample) => total + sample.value, 0);

  return {
    cpuCores: sum(cores),
    memoryTotal: sum(memory),
    swapTotal: sum(swap),
  };
}

/**
 * A log line, without the colour codes.
 *
 * The services write their logs with ANSI colours — the escape sequences
 * are noise in a page, and they make the line unreadable.
 */
function plain(line: string): string {
  return line.replace(/\u001b\[[0-9;]*m/g, '');
}

/**
 * What a project has been doing, over the last day.
 *
 * The count of what its containers wrote, an hour at a time — the honest
 * little graph on a project's card. A project that has never run has
 * nothing to show, and says so.
 */
export async function getProjectActivity(
  projectSlug: string,
  hours = 24,
): Promise<number[]> {
  const base = await lokiUrl();
  if (!base) return [];

  const end = Date.now();
  const start = end - hours * 60 * 60 * 1000;
  const step = 60 * 60 * 1000;

  try {
    const response = await fetch(
      `${base}/loki/api/v1/query_range?query=${encodeURIComponent(`sum(count_over_time({container=~"fidscript-${projectSlug}-.*"}[1h]))`)}&start=${start}&end=${end}&step=${step}&direction=backward`,
      { cache: 'no-store', signal: AbortSignal.timeout(8000) },
    );
    if (!response.ok) return [];

    const body = (await response.json()) as {
      data?: { result?: Array<{ values?: Array<[number, string]> }> };
    };

    const points = body.data?.result?.[0]?.values ?? [];
    const buckets = new Array(hours).fill(0);
    for (const [at, value] of points) {
      const index = hours - 1 - Math.round((end - at * 1000) / step);
      if (index >= 0 && index < hours) buckets[index] = Number(value);
    }
    return buckets;
  } catch {
    return [];
  }
}

/**
 * The logs of one project's containers.
 *
 * The deployment engine names a project's containers after the project, so
 * the machine's log store can be asked for exactly those — the project's
 * own logs, beside the platform's.
 */
export async function getProjectLogs(
  projectSlug: string,
  limit = 60,
): Promise<LogLine[]> {
  const base = await lokiUrl();
  if (!base) return [];

  const end = Date.now() * 1_000_000;
  const start = end - 60 * 60 * 1_000_000;
  const selector = `{container=~"fidscript-${projectSlug}-.*"}`;

  try {
    const response = await fetch(
      `${base}/loki/api/v1/query_range?query=${encodeURIComponent(selector)}&limit=${limit}&start=${start}&end=${end}&direction=backward`,
      { cache: 'no-store', signal: AbortSignal.timeout(8000) },
    );
    if (!response.ok) return [];

    const body = (await response.json()) as {
      data?: {
        result?: Array<{
          stream?: Record<string, string>;
          values?: Array<[string, string]>;
        }>;
      };
    };

    return (body.data?.result ?? []).flatMap((entry) =>
      (entry.values ?? []).map(([at, line]) => ({
        at,
        line: plain(line),
        source:
          entry.stream?.service_name ??
          entry.stream?.container ??
          'the project',
      })),
    );
  } catch {
    return [];
  }
}

/** The requests each site carried. */
export interface SiteTraffic {
  site: string;
  requests: number;
  errors: number;
}

export async function getSiteTraffic(): Promise<SiteTraffic[]> {
  const { serverApi: api } = await import('./server');
  const response = await api
    .get<{ sites?: SiteTraffic[] }>('/system/traffic')
    .catch(() => ({ sites: [] }));
  return response.sites ?? [];
}

/** A log line from the platform. */
export interface LogLine {
  at: string;
  line: string;
  source: string;
}

/** The platform's logs, newest first. */
export async function getSystemLogs(limit = 60): Promise<LogLine[]> {
  const base = await lokiUrl();
  if (!base) return [];

  const end = Date.now() * 1_000_000;
  const start = end - 30 * 60 * 1_000_000;

  try {
    const response = await fetch(
      `${base}/loki/api/v1/query_range?query=${encodeURIComponent('{service_name=~".+"}')}&limit=${limit}&start=${start}&end=${end}&direction=backward`,
      { cache: 'no-store', signal: AbortSignal.timeout(8000) },
    );
    if (!response.ok) return [];

    const body = (await response.json()) as {
      data?: {
        result?: Array<{
          stream?: Record<string, string>;
          values?: Array<[string, string]>;
        }>;
      };
    };

    return (body.data?.result ?? []).flatMap((entry) =>
      (entry.values ?? []).map(([at, line]) => ({
        at,
        line: plain(line),
        source:
          entry.stream?.service_name ??
          entry.stream?.container ??
          'the platform',
      })),
    );
  } catch {
    return [];
  }
}
