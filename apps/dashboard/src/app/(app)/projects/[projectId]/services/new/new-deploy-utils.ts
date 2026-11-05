// Shared utilities and types for the new deployment wizard.
//
// The parts two wizards share live in `@/lib/deployment-source` — this file
// keeps the old import path working.

export {
  type SourceType,
  MAX_ARCHIVE_BYTES,
  extractRepoInfo,
  getAccessToken,
  parseEnvText,
} from '@/lib/deployment-source';

export { type GithubRepo, type GithubBranch, type GithubStatus, type BuildPlan } from './new-deploy-types';

export const STEPS = [
  { label: 'Source' },
  { label: 'Repository' },
  { label: 'Configuration' },
  { label: 'Review' },
] as const;
