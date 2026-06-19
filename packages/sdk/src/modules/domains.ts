import { FidscriptClient } from '../client';

export interface Domain {
  id: string;
  name: string;
  projectId?: string;
  dnsStatus: string;
  sslStatus: string;
  ownerId: string;
  createdAt: string;
}

export class DomainsModule {
  constructor(private client: FidscriptClient) {}

  async list() {
    const res = await this.client.get<{ domains: Domain[] }>('/api/v1/domains');
    return res.domains;
  }

  async get(id: string) {
    return this.client.get<Domain>(`/api/v1/domains/${id}`);
  }

  async create(projectId: string, name: string) {
    return this.client.post<Domain>('/api/v1/domains', { projectId, name });
  }

  async verify(id: string) {
    return this.client.post<Domain>(`/api/v1/domains/${id}/verify`);
  }

  async delete(id: string) {
    return this.client.delete(`/api/v1/domains/${id}`);
  }
}
