import 'server-only';

import { serverApi as api } from './server';
import { getProjectActivity } from './metrics';
import type { Project, ProjectShape } from './types';

/**
 * The projects.
 *
 * The shape is what the project's menu is derived from, so it travels with
 * the project — never in a browser.
 */

/** The projects the signed-in person can reach. */
export async function listProjects(): Promise<Project[]> {
  const response = await api.get<{ projects: Project[] }>('/projects');
  return response.projects;
}

/** Creates a project. */
export async function createProject(input: {
  name: string;
  type: string;
  description?: string;
  /** What the project is for. */
  shape?: ProjectShape;
  /** Whether the deployment service is on for it. */
  deploymentOn?: boolean;
}): Promise<Project> {
  return api.post<Project>('/projects', input);
}

/**
 * The projects, and what each of them is doing.
 *
 * The list is the platform's own; the counts and the sparkline are read
 * per project, so the page says what is true about each one rather than
 * only what its name is.
 */
export interface ProjectSummary {
  project: Project;
  deployments: number;
  running: number;
  domains: number;
  databases: number;
  /** The project's activity over the last day — one point an hour. */
  /** When a deployment of this project last succeeded. */
  lastDeployAt?: string | null;
  activity: number[];
}

export async function getProjectSummaries(
  limit = 24,
): Promise<ProjectSummary[]> {
  const projects = await listProjects().catch(() => []);

  return Promise.all(
    projects.slice(0, limit).map(async (project) => {
      const [deployments, domains, databases, activity] = await Promise.all([
        api
          .get<{
            deployments: Array<{ status?: string }>;
          }>(`/projects/${project.id}/deployments`)
          .catch(() => ({ deployments: [] })),
        api
          .get<{ domains: unknown[] }>(`/projects/${project.id}/domains`)
          .catch(() => ({ domains: [] })),
        api
          .get<{ databases: unknown[] }>(`/projects/${project.id}/databases`)
          .catch(() => ({ databases: [] })),
        getProjectActivity(project.slug),
      ]);

      return {
        project,
        deployments: deployments.deployments.length,
        running: deployments.deployments.filter(
          (deployment) =>
            (deployment.status ?? '').toUpperCase() === 'SUCCESS',
        ).length,
        domains: domains.domains.length,
        databases: databases.databases.length,
        lastDeployAt: project.lastDeployAt ?? null,
        activity,
      };
    }),
  );
}
