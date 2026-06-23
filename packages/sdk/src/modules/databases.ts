import { FidscriptClient } from '../client';

export interface Database {
  id: string;
  name: string;
  type: 'postgres' | 'redis';
  status: string;
  connectionString?: string;
  ownerId: string;
  createdAt: string;
}

export interface DatabaseBackup {
  id: string;
  databaseId: string;
  sizeBytes: number;
  createdAt: string;
}

export class DatabasesModule {
  constructor(private client: FidscriptClient) {}

  async list() {
    const res = await this.client.get<{ databases: Database[] }>('/api/v1/databases');
    return res.databases;
  }

  async get(id: string) {
    return this.client.get<Database>(`/api/v1/databases/${id}`);
  }

  async create(projectId: string, data: { name: string; type: 'postgres' | 'redis' }) {
    return this.client.post<Database>('/api/v1/databases', { projectId, ...data });
  }

  async delete(id: string) {
    return this.client.delete(`/api/v1/databases/${id}`);
  }

  async backup(id: string) {
    return this.client.post<{ backupId: string }>(`/api/v1/databases/${id}/backup`);
  }

  async listBackups(id: string) {
    const res = await this.client.get<{ backups: DatabaseBackup[] }>(`/api/v1/databases/${id}/backups`);
    return res.backups;
  }

  async restore(id: string, backupId: string) {
    return this.client.post(`/api/v1/databases/${id}/restore`, { backupId });
  }

  async rotatePassword(id: string) {
    return this.client.post(`/api/v1/databases/${id}/rotate-password`);
  }

  async getConnection(id: string, poolOnly = false) {
    const params = poolOnly ? '?poolOnly=true' : '';
    return this.client.get<{ host: string; port: number; database: string; connectionString: string }>(
      `/api/v1/databases/${id}/connection${params}`
    );
  }

  async updateSsl(id: string, ssl: boolean) {
    return this.client.patch(`/api/v1/databases/${id}/connection`, { ssl });
  }
}
