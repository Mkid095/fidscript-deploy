/**
 * Operator-facing log stream taxonomy.
 *
 * Maps UI labels to the underlying stream names used by the logging backend.
 * Backend stream names are caller-defined (see LogWriteService.writeLog) —
 * this taxonomy exists so the dashboard exposes a stable, human-friendly
 * surface even as the underlying stream names evolve.
 */
export type StreamKey = 'default' | 'build' | 'access' | 'database' | 'auth';

export interface StreamInfo {
  key: StreamKey;
  /** Underlying log stream name persisted by LogWriteService */
  name: string;
  /** Operator-facing label shown in the UI */
  label: string;
  /** Short blurb explaining what lands in this stream */
  description: string;
}

export const STREAM_TAXONOMY: readonly StreamInfo[] = [
  {
    key: 'default',
    name: 'default',
    label: 'System',
    description: 'Application-emitted logs from running services (catch-all)',
  },
  {
    key: 'build',
    name: 'build',
    label: 'Deployment',
    description: 'Build pipeline output emitted during deployment lifecycle events',
  },
  {
    key: 'access',
    name: 'access',
    label: 'API',
    description: 'HTTP request / access logs emitted by API gateways',
  },
  {
    key: 'database',
    name: 'database',
    label: 'Database',
    description: 'Database query / migration / connection logs',
  },
  {
    key: 'auth',
    name: 'auth',
    label: 'Auth',
    description: 'Authentication events: logins, token issuance, session lifecycle',
  },
] as const;

export function streamInfoFor(key: StreamKey): StreamInfo {
  const info = STREAM_TAXONOMY.find(s => s.key === key);
  if (!info) throw new Error(`Unknown stream key: ${key}`);
  return info;
}

/** Resolve an operator-facing label back to the backend stream name. */
export function labelToStreamName(label: string): string | undefined {
  const info = STREAM_TAXONOMY.find(s => s.label === label || s.name === label);
  return info?.name;
}