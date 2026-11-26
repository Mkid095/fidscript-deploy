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
  /** The mode bag — `proxy` says whether the name answers through Cloudflare. */
  capabilities: Record<string, unknown>;
  dnsMode: string;
  sslEnabled: boolean;
  sslStatus: string;
  /** Where the DNS stands: pending, validating, active, broken… */
  dnsStatus: string;
  dnsVerifiedAt: string | null;
  /** The deployment this name answers for, when it is pointed at one. */
  deploymentId: string | null;
  /** When the certificate really expires, as the HTTPS check read it. */
  sslExpiresAt: string | null;
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
  const response = await api.get<{ deployments: Deployment[] }>(
    `/projects/${projectId}/deployments`,
  );
  return response.deployments;
}

/** One deployment, with its release. */
export async function getDeployment(
  projectId: string,
  deploymentId: string,
): Promise<Deployment> {
  return api.get<Deployment>(
    `/projects/${projectId}/deployments/${deploymentId}`,
  );
}

/** The build log of a deployment. */
export async function getDeploymentLogs(
  projectId: string,
  deploymentId: string,
): Promise<string> {
  const response = await api
    .get<{
      logs: string;
    }>(`/projects/${projectId}/deployments/${deploymentId}/logs`)
    .catch(() => ({ logs: '' }));
  return response.logs;
}

/** The project's domains. */
export async function getDomains(projectId: string): Promise<Domain[]> {
  const response = await api.get<{ domains: Domain[] }>(
    `/projects/${projectId}/domains`,
  );
  return response.domains;
}

/** The project's managed databases. */
export async function getDatabases(projectId: string): Promise<Database[]> {
  const response = await api.get<{ databases: Database[] }>(
    `/projects/${projectId}/databases`,
  );
  return response.databases;
}

/** The project's functions. */
export async function getFunctions(projectId: string): Promise<Function[]> {
  const response = await api.get<{ functions: Function[] }>(
    `/projects/${projectId}/functions`,
  );
  return response.functions;
}

/** The DNS records a domain needs, so it reaches the platform. */
export async function getDomainInstructions(
  projectId: string,
  domainId: string,
): Promise<
  Array<{
    type: string;
    name: string;
    value: string;
    ttl?: number;
    notes?: string;
  }>
> {
  const response = await api.get<{
    instructions: Array<{
      type: string;
      name: string;
      value: string;
      ttl?: number;
      notes?: string;
    }>;
  }>(`/projects/${projectId}/domains/${domainId}/instructions`);
  return response.instructions;
}

/** What has happened in this project. */
export async function getProjectEvents(
  projectId: string,
): Promise<ProjectEvent[]> {
  const response = await api.get<ProjectEvent[]>(
    `/projects/${projectId}/events`,
  );
  return response;
}

/** The shape the API's Git integration status reports. */
export interface GitIntegrationStatus {
  /** A GitHub connection exists for the project's owner. */
  connected: boolean;
  account: string | null;
  tokenHealthy: boolean;
  tokenNote: string | null;
  repository: string | null;
  branch: string;
  autoDeploy: boolean;
  /**
   * `registered` is true only when a hook id is stored on the project —
   * the status is never assumed, and a failed registration reads as
   * not registered.
   */
  webhook: { registered: boolean; hookId: number | null };
  lastCommit: {
    sha: string;
    message: string;
    at: string;
  } | null;
  lastSuccess: {
    id: string;
    deploymentUrl: string | null;
    completedAt: string | null;
  } | null;
  /** The commit production runs — the push gate's dedup key. */
  lastDeployedCommit: string | null;
  /** The ONE-deployment-identity rule, in the UI's words. */
  deploymentInitialized: boolean;
}

/** The project's Git integration: what is connected, what is live. */
export async function getGitIntegration(
  projectId: string,
): Promise<GitIntegrationStatus | null> {
  const response = await api.get<GitIntegrationStatus>(
    `/projects/${projectId}/git-integration`,
  );
  return response;
}

/**
 * The application's build settings: the commands and the port a person
 * overrode, and the container's resource ceilings. A null ceiling means the
 * platform's own default (512 MB, one core).
 */
export interface BuildConfig {
  buildTarget: string | null;
  startupTimeoutSeconds: number;
  requiredEnvVars: string[];
  installCommand: string | null;
  buildCommand: string | null;
  startCommand: string | null;
  port: number | null;
  /** The container's memory ceiling in MB; null means the platform default (512). */
  memoryLimitMb: number | null;
  /** The container's CPU ceiling in millicpus; null means the platform default (1000). */
  cpuLimitMillicpu: number | null;
}

export async function getBuildConfig(
  projectId: string,
): Promise<BuildConfig | null> {
  try {
    return await api.get<BuildConfig>(`/projects/${projectId}/build-config`);
  } catch {
    return null;
  }
}
