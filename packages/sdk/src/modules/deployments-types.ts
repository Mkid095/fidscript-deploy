/**
 * Deployments module — public type contracts.
 * Extracted from deployments.ts to keep the module under the ANPAS 150-line limit.
 */

export interface Deployment {
  id: string;
  projectId: string;
  releaseId: string | null;
  status: string;
  deploymentUrl: string | null;
  rolledBackToId: string | null;
  createdAt: string;
  completedAt: string | null;
  // Enriched fields from the API response
  branch?: string;
  commitSha?: string;
  commitMessage?: string;
  imageTag?: string;
  sourceUrl?: string;
  sourceType?: 'git' | 'archive';
  createdBy?: string;
}

export interface DeploymentListResult {
  deployments: Deployment[];
  pagination: { page: number; limit: number; total: number; pages: number };
}

/**
 * Build configuration for a project.
 * Only buildTarget (monorepo app root) and startupTimeoutSeconds are
 * consumed by the deployment runner — all other fields were dead code
 * that the build providers ignored (they re-derive everything from
 * package.json detection).
 */
export interface BuildConfig {
  buildTarget?: string;
  startupTimeoutSeconds?: number;
}

/**
 * Framework detection result returned by POST /deployments/detect.
 * This is the "BuildPlan" — what the platform detected and how it
 * will build the project, shown to the user before they deploy.
 */
export interface BuildPlan {
  framework: string;          // 'next' | 'vite' | 'astro' | 'nuxt' | 'sveltekit' | 'node' | 'static' | 'unknown'
  frameworkLabel: string;     // 'Next.js', 'Vite', 'Astro', etc.
  frameworkVersion?: string;  // e.g. '15.2.0' from package.json
  buildCommand: string;       // 'npm run build'
  startCommand: string;       // 'npx next start'
  outputDirectory: string;    // '.next', 'dist', '.'
  port: number;               // 3000, 4173, 8080, etc.
  runtime: string;            // 'Node 20'
  monorepo?: string;          // 'pnpm' | 'turbo' | 'nx' | undefined
  detectedAt: string;         // ISO timestamp
}

export interface CreateDeploymentInput {
  source?: {
    type: 'git' | 'archive';
    git?: {
      url?: string;
      credentials?: string;
      branch?: string;
      dockerfilePath?: string;
    };
    archive?: {
      bucketId?: string;
      objectKey?: string;
      dockerfilePath?: string;
    };
  };
  branch?: string;
  commitSha?: string;
  commitMessage?: string;
  /** Environment variables to inject at build and runtime. Overrides project-level env vars. */
  envVars?: Record<string, string>;
}

export interface DetectInput {
  gitUrl: string;
  branch?: string;
  credentials?: string;
}