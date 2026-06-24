import { FidscriptClient } from '../client';

export interface Project {
  id: string;
  name: string;
  slug: string;
  type: string;
  status: string;
  ownerId: string;
  role?: string;
  description?: string;
  lastActivityAt?: string;
  lastDeployAt?: string;
  region?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectMember {
  userId: string;
  email: string;
  role: string;
  joinedAt: string;
}

export interface EnvVar {
  key: string;
  value: string;
  encrypted: boolean;
}

/** Async iterator for cursor-paginated list endpoints */
export async function* paginate<T>(
  client: FidscriptClient,
  path: string,
  params: Record<string, unknown> = {},
  pageSize = 100,
): AsyncGenerator<T> {
  let cursor: string | undefined;
  while (true) {
    const res = await client.get<{ items: T[]; nextCursor?: string }>(path, {
      ...params,
      ...(cursor ? { cursor } : {}),
      limit: pageSize,
    });
    for (const item of res.items) yield item;
    cursor = res.nextCursor;
    if (!cursor) break;
  }
}

export class ProjectsModule {
  constructor(private client: FidscriptClient) {}

  async list() {
    const res = await this.client.get<{ projects: Project[] }>('/api/v1/projects');
    return res.projects;
  }

  listAll() {
    return paginate<Project>(this.client, '/api/v1/projects');
  }

  async get(id: string) {
    return this.client.get<Project>(`/api/v1/projects/${id}`);
  }

  async create(data: { name: string; type?: string; slug?: string; description?: string }) {
    return this.client.post<Project>('/api/v1/projects', data);
  }

  async update(id: string, data: Partial<Project>) {
    return this.client.patch<Project>(`/api/v1/projects/${id}`, data);
  }

  async delete(id: string) {
    return this.client.delete(`/api/v1/projects/${id}`);
  }

  // Members
  async listMembers(projectId: string) {
    const res = await this.client.get<{ members: ProjectMember[] }>(`/api/v1/projects/${projectId}/members`);
    return res.members;
  }

  async addMember(projectId: string, email: string, role: string) {
    return this.client.post(`/api/v1/projects/${projectId}/members`, { email, role });
  }

  async removeMember(projectId: string, userId: string) {
    return this.client.delete(`/api/v1/projects/${projectId}/members/${userId}`);
  }

  // Env vars
  async getEnvVars(projectId: string) {
    const res = await this.client.get<{ envVars: EnvVar[] }>(`/api/v1/projects/${projectId}/env`);
    return res.envVars;
  }

  async setEnvVars(projectId: string, envVars: Record<string, string>) {
    return this.client.put(`/api/v1/projects/${projectId}/env`, { envVars });
  }

  // API Keys
  async listApiKeys(projectId: string) {
    const res = await this.client.get<{ apiKeys: Array<{ id: string; name: string; createdAt: string }> }>(
      `/api/v1/projects/${projectId}/api-keys`,
    );
    return res.apiKeys;
  }

  async createApiKey(projectId: string, name: string, permissions?: string[]) {
    return this.client.post<{ apiKey: { id: string }; key: string }>(`/api/v1/projects/${projectId}/api-keys`, {
      name,
      permissions,
    });
  }

  async revokeApiKey(projectId: string, keyId: string) {
    return this.client.delete(`/api/v1/projects/${projectId}/api-keys/${keyId}`);
  }

  // Invitations
  async listInvitations(projectId: string) {
    return this.client.get(`/api/v1/projects/${projectId}/invitations`);
  }

  async invite(projectId: string, email: string, role: string) {
    return this.client.post(`/api/v1/projects/${projectId}/invitations`, { email, role });
  }

  async acceptInvitation(token: string) {
    return this.client.post(`/api/v1/projects/invitations/accept`, { token });
  }

  // Events (PREREQ-PROJ-3)
  async getEvents(projectId: string, limit = 20) {
    return this.client.get<unknown[]>(`/api/v1/projects/${projectId}/events`, { limit });
  }
}
