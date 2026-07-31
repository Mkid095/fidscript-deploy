// Deployment types

export interface Deployment {
  id: string;
  projectId: string;
  releaseId: string | null;
  status: string;
  deploymentUrl: string | null;
  rolledBackToId: string | null;
  createdAt: string;
  completedAt: string | null;
  version?: string;
  commitSha?: string;
  commitMessage?: string;
  branch?: string;
  imageTag?: string;
  sourceUrl?: string;
  sourceType?: 'git' | 'archive';
  createdBy?: string;
}
