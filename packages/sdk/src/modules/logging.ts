import { FidscriptClient } from '../client';

export interface LogStream {
  id: string;
  name: string;
  type: string;
  retentionDays: number;
  createdAt: string;
}

export interface LogEntry {
  id: string;
  level: 'debug' | 'info' | 'warn' | 'error' | 'fatal';
  message: string;
  metadata?: Record<string, unknown>;
  timestamp: string;
}

export interface LogStats {
  total: number;
  byLevel: Record<string, number>;
  streamCount: number;
}

export interface IngestResult {
  accepted: number;
  overQuota: number;
  results: Array<{ stream: string; level: string; entryId?: string; overQuota?: boolean }>;
}

/**
 * Phase 16 SDK — Logging module.
 *
 * Supports both JWT-authenticated CRUD (project-scoped logs endpoints) and
 * API-key-authenticated bulk ingest (POST /logs/ingest).
 */
export class LoggingModule {
  constructor(private client: FidscriptClient) {}

  // ── JWT-authenticated CRUD (project-scoped) ──────────────────────────────────

  async listStreams(projectId: string) {
    const res = await this.client.get<{ streams: LogStream[] }>(
      `/api/v1/projects/${projectId}/logs/streams`,
    );
    return res.streams;
  }

  async createStream(
    projectId: string,
    name: string,
    type: string,
    retentionDays?: number,
  ) {
    return this.client.post<LogStream>(`/api/v1/projects/${projectId}/logs/streams`, {
      name,
      type,
      retentionDays,
    });
  }

  async getStream(projectId: string, streamId: string) {
    return this.client.get<LogStream>(`/api/v1/projects/${projectId}/logs/streams/${streamId}`);
  }

  async deleteStream(projectId: string, streamId: string) {
    return this.client.delete(`/api/v1/projects/${projectId}/logs/streams/${streamId}`);
  }

  async getLogs(
    projectId: string,
    options?: {
      stream?: string;
      level?: string;
      startTime?: string;
      endTime?: string;
      search?: string;
      limit?: number;
      cursor?: string;
    },
  ) {
    const res = await this.client.get<{ logs: LogEntry[]; nextCursor?: string }>(
      `/api/v1/projects/${projectId}/logs`,
      options ?? {},
    );
    return res;
  }

  async getLogsByStream(
    projectId: string,
    streamName: string,
    options?: { level?: string; search?: string; limit?: number; cursor?: string },
  ) {
    const res = await this.client.get<{ logs: LogEntry[]; nextCursor?: string }>(
      `/api/v1/projects/${projectId}/logs/streams/${streamName}`,
      options ?? {},
    );
    return res;
  }

  async getStats(projectId: string, stream?: string) {
    return this.client.get<LogStats>(`/api/v1/projects/${projectId}/logs/stats`, { stream });
  }

  async getTimeline(projectId: string, streamName: string, interval = '1h') {
    return this.client.get(`/api/v1/projects/${projectId}/logs/streams/${streamName}/timeline`, { interval });
  }

  // Streaming log tail — async iterable
  streamLogs(
    projectId: string,
    options?: { stream?: string; level?: string },
  ) {
    return this.client.streamGet<LogEntry>(`/api/v1/projects/${projectId}/logs`, options ?? {});
  }

  // ── API-key-authenticated bulk ingest ─────────────────────────────────────
  // POST /logs/ingest does not use JWT — it uses X-API-Key header.
  // This method is separate from the client since the ingest endpoint has its own auth path.
  async ingest(
    apiKey: string,
    entries: Array<{
      level: 'debug' | 'info' | 'warn' | 'error' | 'fatal';
      source: string;
      message: string;
      metadata?: Record<string, unknown>;
      correlationId?: string;
      timestamp?: string;
    }>,
  ): Promise<IngestResult> {
    // We need a fetch-based call that bypasses the Axios client's auth header.
    // Use the same baseURL as the authenticated client (no hardcoded host —
    // every consumer of this open-source SDK picks their own API host).
    const baseURL = this.client.baseURL;
    if (!baseURL) throw new Error('No baseURL configured for log ingest');
    const res = await fetch(`${baseURL}/api/v1/logs/ingest`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': apiKey,
      },
      body: JSON.stringify({ logs: entries }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({ message: undefined })) as { message?: string };
      throw new Error(data?.message ?? `Ingest failed: HTTP ${res.status}`);
    }
    return res.json() as Promise<IngestResult>;
  }
}
