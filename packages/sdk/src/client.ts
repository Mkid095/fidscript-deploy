// FIDScript SDK Client
import type {
  User,
  Project,
  Deployment,
  Database,
  Domain,
  ApiResponse,
  PaginatedResponse,
} from './types';

const DEFAULT_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export class FIDScriptClient {
  private baseUrl: string;
  private headers: Record<string, string>;

  constructor(options: { baseUrl?: string; apiKey?: string } = {}) {
    this.baseUrl = options.baseUrl || DEFAULT_BASE_URL;
    this.headers = {
      'Content-Type': 'application/json',
      ...(options.apiKey && { Authorization: `Bearer ${options.apiKey}` }),
    };
  }

  // Auth
  async login(email: string, password: string): Promise<ApiResponse<{ user: User; token: string }>> {
    const res = await fetch(`${this.baseUrl}/api/v1/auth/login`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify({ email, password }),
    });
    return res.json() as any;
  }

  async register(email: string, password: string, name: string): Promise<ApiResponse<{ user: User }>> {
    const res = await fetch(`${this.baseUrl}/api/v1/auth/register`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify({ email, password, name }),
    });
    return res.json() as any;
  }

  // Projects
  async getProjects(): Promise<PaginatedResponse<Project>> {
    const res = await fetch(`${this.baseUrl}/api/v1/projects`, { headers: this.headers });
    return res.json() as any;
  }

  async getProject(id: string): Promise<ApiResponse<Project>> {
    const res = await fetch(`${this.baseUrl}/api/v1/projects/${id}`, { headers: this.headers });
    return res.json() as any;
  }

  async createProject(data: Partial<Project>): Promise<ApiResponse<Project>> {
    const res = await fetch(`${this.baseUrl}/api/v1/projects`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify(data),
    });
    return res.json() as any;
  }

  async deleteProject(id: string): Promise<ApiResponse<void>> {
    const res = await fetch(`${this.baseUrl}/api/v1/projects/${id}`, {
      method: 'DELETE',
      headers: this.headers,
    });
    return res.json() as any;
  }

  // Deployments
  async getDeployments(projectId: string): Promise<PaginatedResponse<Deployment>> {
    const res = await fetch(`${this.baseUrl}/api/v1/projects/${projectId}/deployments`, { headers: this.headers });
    return res.json() as any;
  }

  async createDeployment(projectId: string): Promise<ApiResponse<Deployment>> {
    const res = await fetch(`${this.baseUrl}/api/v1/projects/${projectId}/deployments`, {
      method: 'POST',
      headers: this.headers,
    });
    return res.json() as any;
  }

  // Databases
  async getDatabases(): Promise<PaginatedResponse<Database>> {
    const res = await fetch(`${this.baseUrl}/api/v1/databases`, { headers: this.headers });
    return res.json() as any;
  }

  async createDatabase(data: Partial<Database>): Promise<ApiResponse<Database>> {
    const res = await fetch(`${this.baseUrl}/api/v1/databases`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify(data),
    });
    return res.json() as any;
  }

  // Domains
  async getDomains(): Promise<PaginatedResponse<Domain>> {
    const res = await fetch(`${this.baseUrl}/api/v1/domains`, { headers: this.headers });
    return res.json() as any;
  }

  async createDomain(data: Partial<Domain>): Promise<ApiResponse<Domain>> {
    const res = await fetch(`${this.baseUrl}/api/v1/domains`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify(data),
    });
    return res.json() as any;
  }

  async verifyDomain(id: string): Promise<ApiResponse<Domain>> {
    const res = await fetch(`${this.baseUrl}/api/v1/domains/${id}/verify`, {
      method: 'POST',
      headers: this.headers,
    });
    return res.json() as any;
  }
}

// Default export
export default FIDScriptClient;
