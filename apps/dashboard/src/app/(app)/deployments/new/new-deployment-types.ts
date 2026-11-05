// The types of the platform-wide deployment wizard.

import type { GithubRepo, GithubBranch, GithubStatus, BuildPlan } from '@/app/(app)/projects/[projectId]/services/new/new-deploy-types';

export type { GithubRepo, GithubBranch, GithubStatus, BuildPlan };

/** Where the code comes from. */
export type ImportSource = 'github' | 'git' | 'archive';

/** A workspace (a team) a project can live in. */
export interface Workspace {
  id: string;
  name: string;
  slug: string;
}

/** One environment variable, and whether the build needs it. */
export interface EnvVarEntry {
  key: string;
  value: string;
  /** A required variable stops the build when it is missing. */
  required: boolean;
}
