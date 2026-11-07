import 'server-only';

import { serverApi as api } from './server';
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

/** One project. */
export async function getProject(projectId: string): Promise<Project> {
  const response = await api.get<{ project: Project }>(`/projects/${projectId}`);
  return response.project;
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
  const response = await api.post<{ project: Project }>('/projects', input);
  return response.project;
}

/** Changes a project. */
export async function updateProject(
  projectId: string,
  input: { name?: string; description?: string; shape?: ProjectShape; deploymentOn?: boolean },
): Promise<Project> {
  const response = await api.patch<{ project: Project }>(`/projects/${projectId}`, input);
  return response.project;
}

/** The project's members. */
export async function projectMembers(projectId: string): Promise<Array<{ userId: string; email: string; role: string }>> {
  const response = await api.get<{ members: Array<{ userId: string; email: string; role: string }> }>(
    `/projects/${projectId}/members`,
  );
  return response.members;
}
