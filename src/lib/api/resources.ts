import 'server-only';

import { serverApi as api } from './server';

/**
 * The things a project has.
 *
 * Each one is read from the API — nothing here is invented, and nothing is
 * cached beyond the request.
 */

export interface Deployment {
  id: string;
  projectId: string;
  releaseId: string | null;
  status: string;
  deploymentUrl: string | null;
  createdAt: string;
  completedAt: string | null;
  release?: {
    version: string | null;
    branch: string | null;
    commitSha: string | null;
    commitMessage: string | null;
    sourceUrl: string | null;
  } | null;
}

export interface Domain {
  id: string;
  domain: string;
  isCustom: boolean;
  isPrimary: boolean;
  type: string[];
  sslEnabled: boolean;
  sslStatus: string;
  createdAt: string;
}

export interface Database {
  id: string;
  name: string;
  type: string;
  version: string;
  status: string;
  environment: string;
  host: string;
  port: number;
  username: string;
  size: string;
  createdAt: string;
}

export interface Function {
  id: string;
  name: string;
  runtime?: string;
  status?: string;
  createdAt: string;
}

export interface ProjectEvent {
  id: string;
  type: string;
  payload?: unknown;
  createdAt: string;
}

/** The project's deployments, newest first. */
export async function getDeployments(projectId: string): Promise<Deployment[]> {
  const response = await api.get<{ deployments: Deployment[] }>(`/projects/${projectId}/deployments`);
  return response.deployments;
}

/** The project's domains. */
export async function getDomains(projectId: string): Promise<Domain[]> {
  const response = await api.get<{ domains: Domain[] }>(`/projects/${projectId}/domains`);
  return response.domains;
}

/** The project's managed databases. */
export async function getDatabases(projectId: string): Promise<Database[]> {
  const response = await api.get<{ databases: Database[] }>(`/projects/${projectId}/databases`);
  return response.databases;
}

/** The project's functions. */
export async function getFunctions(projectId: string): Promise<Function[]> {
  const response = await api.get<{ functions: Function[] }>(`/projects/${projectId}/functions`);
  return response.functions;
}

/** The DNS records a domain needs, so it reaches the platform. */
export async function getDomainInstructions(
  projectId: string,
  domainId: string,
): Promise<Array<{ type: string; name: string; value: string; ttl?: number; notes?: string }>> {
  const response = await api.get<{
    instructions: Array<{ type: string; name: string; value: string; ttl?: number; notes?: string }>;
  }>(`/projects/${projectId}/domains/${domainId}/instructions`);
  return response.instructions;
}

/** What has happened in this project. */
export async function getProjectEvents(projectId: string): Promise<ProjectEvent[]> {
  const response = await api.get<ProjectEvent[]>(`/projects/${projectId}/events`);
  return response;
}
