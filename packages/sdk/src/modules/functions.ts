import { FidscriptClient } from '../client';

export interface Function_ {
  id: string;
  name: string;
  runtime: string;
  status: string;
  projectId?: string;
  createdAt: string;
}

export interface FunctionVersion {
  version: string;
  createdAt: string;
  status: string;
}

export interface FunctionLog {
  id: string;
  timestamp: string;
  level: string;
  message: string;
}

export class FunctionsModule {
  constructor(private client: FidscriptClient) {}

  async list(projectId: string) {
    const res = await this.client.get<{ functions: Function_[] }>(`/api/v1/projects/${projectId}/functions`);
    return res.functions;
  }

  async get(projectId: string, functionId: string) {
    return this.client.get<Function_>(`/api/v1/projects/${projectId}/functions/${functionId}`);
  }

  async create(projectId: string, data: { name: string; runtime: string; memoryMb?: number; timeoutSeconds?: number }) {
    return this.client.post<Function_>(`/api/v1/projects/${projectId}/functions`, data);
  }

  async update(projectId: string, functionId: string, data: { memoryMb?: number; timeoutSeconds?: number; currentVersion?: string }) {
    return this.client.patch<Function_>(`/api/v1/projects/${projectId}/functions/${functionId}`, data);
  }

  async deploy(projectId: string, functionId: string, code: string, version?: string) {
    return this.client.post<{ status: string }>(`/api/v1/projects/${projectId}/functions/${functionId}/deploy`, { code, version });
  }

  async listVersions(projectId: string, functionId: string) {
    return this.client.get<FunctionVersion[]>(`/api/v1/projects/${projectId}/functions/${functionId}/versions`);
  }

  async getCode(projectId: string, functionId: string, version?: string) {
    return this.client.get<{ code: string | null; versioned: boolean }>(
      `/api/v1/projects/${projectId}/functions/${functionId}/code`,
      { version },
    );
  }

  async invoke(projectId: string, functionId: string, payload?: unknown) {
    return this.client.post<{ result: unknown }>(`/api/v1/projects/${projectId}/functions/${functionId}/invoke`, { payload });
  }

  async getLogs(projectId: string, functionId: string, limit = 50) {
    const res = await this.client.get<{ logs: FunctionLog[] }>(
      `/api/v1/projects/${projectId}/functions/${functionId}/logs`,
      { limit },
    );
    return res.logs;
  }

  streamLogs(projectId: string, functionId: string) {
    return this.client.streamGet<FunctionLog>(`/api/v1/projects/${projectId}/functions/${functionId}/logs`);
  }

  async delete(projectId: string, functionId: string) {
    return this.client.delete(`/api/v1/projects/${projectId}/functions/${functionId}`);
  }
}
