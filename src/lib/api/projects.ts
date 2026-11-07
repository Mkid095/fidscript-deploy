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
