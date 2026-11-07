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
  apexDomain: boolean;
  type: string[];
  capabilities: Record<string, boolean>;
  dnsMode: string;
  sslEnabled: boolean;
  sslStatus: string;
  /** Where the DNS stands: pending, active, broken… */
  dnsStatus: string;
  dnsVerifiedAt: string | null;
  deploymentUrl: string | null;
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

/** One deployment, with its release. */
export async function getDeployment(
  projectId: string,
  deploymentId: string,
): Promise<Deployment> {
  return api.get<Deployment>(`/projects/${projectId}/deployments/${deploymentId}`);
}

/** The build log of a deployment. */
export async function getDeploymentLogs(
  projectId: string,
  deploymentId: string,
): Promise<string> {
  const response = await api
    .get<{ logs: string }>(`/projects/${projectId}/deployments/${deploymentId}/logs`)
    .catch(() => ({ logs: '' }));
  return response.logs;
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
