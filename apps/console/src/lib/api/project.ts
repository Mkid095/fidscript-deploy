import 'server-only';

import { serverApi as api } from './server';
import type { InstantApp, Project, ProjectShape } from './types';

/**
 * A project, and what it has.
 *
 * The counts are what the sidebar is derived from — a menu item appears
 * because the project **has** the thing, not because the platform could
 * always have it.
 */

export interface ProjectResources {
  databases: number;
  functions: number;
  deployments: number;
  domains: number;
  emailDomains: number;
}

export interface ProjectWithResources {
  project: Project;
  resources: ProjectResources;
}

/** The project itself. */
export async function getProject(projectId: string): Promise<Project> {
  return api.get<Project>(`/projects/${projectId}`);
}

/** What the project has, counted. */
export async function getProjectResources(projectId: string): Promise<ProjectResources> {
  const [databases, functions, deployments, domains, emailDomains] = await Promise.all([
    api.get<{ databases: unknown[] }>(`/projects/${projectId}/databases`).catch(() => ({ databases: [] })),
    api.get<{ functions: unknown[] }>(`/projects/${projectId}/functions`).catch(() => ({ functions: [] })),
    api
      .get<{ deployments: unknown[] }>(`/projects/${projectId}/deployments`)
      .catch(() => ({ deployments: [] })),
    api.get<{ domains: unknown[] }>(`/projects/${projectId}/domains`).catch(() => ({ domains: [] })),
    api.get<unknown[]>(`/projects/${projectId}/email/domains`).catch(() => []),
  ]);

  return {
    databases: databases.databases.length,
    functions: functions.functions.length,
    deployments: deployments.deployments.length,
    domains: domains.domains.length,
    emailDomains: emailDomains.length,
  };
}

/** The project's storage buckets. */
export async function getProjectBuckets(
  projectId: string,
): Promise<Array<{ id: string; name: string }>> {
  const response = await api
    .get<{ buckets?: Array<{ id: string; name: string }> }>(`/projects/${projectId}/storage/buckets`)
    .catch(() => ({ buckets: [] }));
  return response.buckets ?? [];
}

/** The project's members — the people, and what they may do here. */
export async function getProjectMembers(
  projectId: string,
): Promise<Array<{ id: string; role: string; user: { id: string; email: string; name: string | null } }>> {
  const response = await api.get<{
    members: Array<{
      id: string;
      role: string;
      user: { id: string; email: string; name: string | null };
    }>;
  }>(`/projects/${projectId}/members`);
  return response.members;
}

/**
 * The project's shape, and whether the deployment service is on.
 *
 * The shape comes from the project. The deployment switch follows it unless
 * the project says otherwise.
 */
export async function setProjectShape(
  projectId: string,
  shape: ProjectShape,
  deploymentOn?: boolean,
): Promise<Project> {
  return api.patch<Project>(`/projects/${projectId}`, {
    shape,
    ...(deploymentOn === undefined ? {} : { deploymentOn }),
  });
}

/** The project's name and description. */
export async function updateProject(
  projectId: string,
  changes: { name?: string; description?: string | null },
): Promise<Project> {
  return api.patch<Project>(`/projects/${projectId}`, changes);
}

/** The project's Instant app, and whether the platform can make one. */
export async function getInstantApp(
  projectId: string,
): Promise<{ available: boolean; dashboardUrl: string | null; app: InstantApp | null }> {
  return api.get<{ available: boolean; dashboardUrl: string | null; app: InstantApp | null }>(
    `/projects/${projectId}/instant`,
  );
}

/** Ask Instant for an app for this project. */
export async function provisionInstantApp(projectId: string, title?: string): Promise<InstantApp> {
  return api.post<InstantApp>(`/projects/${projectId}/instant`, { title });
}

/**
 * What a deployed application needs to reach this project's data plane.
 *
 * The admin token is not in it, and never is — it is the platform's
 * credential, not the application's.
 */
export async function getInstantConfig(
  projectId: string,
): Promise<{ apiHost: string; dashboardUrl: string; appId: string } | null> {
  return api
    .get<{ apiHost: string; dashboardUrl: string; appId: string }>(
      `/projects/${projectId}/instant/config`,
    )
    .catch(() => null);
}

/** The project's variables and secrets. */
export async function getProjectEnvVars(
  projectId: string,
): Promise<Array<{ key: string; value: string; encrypted: boolean }>> {
  const response = await api.get<{
    envVars: Array<{ key: string; value: string; encrypted: boolean }>;
  }>(`/projects/${projectId}/env-vars`);
  return response.envVars;
}

/** Archive the project — it stops, and it keeps everything it has. */
export async function archiveProject(projectId: string): Promise<void> {
  await api.post(`/projects/${projectId}/archive`);
}

/** Delete the project, and everything in it. */
export async function deleteProject(projectId: string): Promise<void> {
  await api.delete(`/projects/${projectId}`);
}
