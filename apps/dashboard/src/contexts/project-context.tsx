'use client';

import { createContext, useContext } from 'react';

import type { Project } from '@/types';

/**
 * The "active project" for a sub-route under the project shell.
 *
 * The project shell layout populates this provider; sidebar service pages
 * (functions, databases, storage, etc.) read projectId from here instead of
 * rendering their own project picker. Pages rendered outside the project
 * shell (top-level /functions, /databases) get `null` and fall back to
 * their own picker.
 *
 * ponytail: one context with three fields, no provider-side state, no
 * effects — just a typed handoff from the shell to its children.
 */
interface ProjectContextValue {
  projectId: string | null;
  project: Project | null;
}

const ProjectContext = createContext<ProjectContextValue>({ projectId: null, project: null });

export function ProjectProvider({ projectId, project, children }: ProjectContextValue & { children: React.ReactNode }) {
  return (
    <ProjectContext.Provider value={{ projectId, project }}>
      {children}
    </ProjectContext.Provider>
  );
}

export function useProjectContext(): ProjectContextValue {
  return useContext(ProjectContext);
}

/**
 * Returns the projectId the project shell has chosen, or null when this page
 * is rendered outside the shell (top-level /functions, /databases, etc.).
 *
 * Pages render their own project picker when this returns null; otherwise
 * the picker is hidden and the shell's projectId is the source of truth.
 */
export function useShellProjectId(): string | null {
  return useContext(ProjectContext).projectId;
}
