/**
 * Runtime env var passed to the container at deploy time.
 */
export interface RuntimeEnv {
  key: string;
  value: string;
}

/**
 * DeploymentProfile defines how a project type is deployed.
 *
 * Used by BuildRunnerService to branch on:
 * - Whether to create a Traefik route
 * - Whether to run an HTTP health check probe
 * - Whether to require a port
 * - Whether to use the app network
 *
 * Extensible: future buildpack providers can return a profile
 * without the deployment engine needing to change.
 */
export interface DeploymentProfile {
  /** Human-readable name */
  label: string;

  /** Whether this project type exposes an HTTP port and needs Traefik routing */
  requiresRoute: boolean;

  /** Whether the container must expose a port for health checking */
  requiresPort: boolean;

  /** Default port to expose (when requiresPort is true) */
  defaultPort: number;

  /** Whether to run an HTTP health check probe after container start */
  requiresHealthCheck: boolean;

  /** Health check path (when requiresHealthCheck is true) */
  healthCheckPath: string;

  /** Whether this project runs as a background worker (no HTTP) */
  isWorker: boolean;

  /** Whether this project type supports cron-style scheduling */
  isCron: boolean;
}

/** All known project types and their deployment profiles */
export const DEPLOYMENT_PROFILES: Record<string, DeploymentProfile> = {
  FRONTEND: {
    label: 'Frontend',
    requiresRoute: true,
    requiresPort: true,
    defaultPort: 3000,
    requiresHealthCheck: true,
    healthCheckPath: '/',
    isWorker: false,
    isCron: false,
  },
  BACKEND: {
    label: 'Backend API',
    requiresRoute: true,
    requiresPort: true,
    defaultPort: 3000,
    requiresHealthCheck: true,
    healthCheckPath: '/health',
    isWorker: false,
    isCron: false,
  },
  STATIC: {
    label: 'Static Site',
    requiresRoute: true,
    requiresPort: true,
    defaultPort: 8080,
    requiresHealthCheck: true,
    healthCheckPath: '/',
    isWorker: false,
    isCron: false,
  },
  DOCKER: {
    label: 'Docker',
    requiresRoute: true,
    requiresPort: true,
    defaultPort: 3000,
    requiresHealthCheck: true,
    healthCheckPath: '/',
    isWorker: false,
    isCron: false,
  },
  FUNCTION: {
    label: 'Serverless Function',
    requiresRoute: false,
    requiresPort: false,
    defaultPort: 0,
    requiresHealthCheck: false,
    healthCheckPath: '',
    isWorker: true,  // Same as WORKER: no route, no port, no HTTP
    isCron: false,
  },
  WORKER: {
    label: 'Background Worker',
    requiresRoute: false,
    requiresPort: false,
    defaultPort: 0,
    requiresHealthCheck: false,
    healthCheckPath: '',
    isWorker: true,
    isCron: false,
  },
  CRON: {
    label: 'Cron Job',
    requiresRoute: false,
    requiresPort: false,
    defaultPort: 0,
    requiresHealthCheck: false,
    healthCheckPath: '',
    isWorker: false,
    isCron: true,
  },
};

/** Look up the deployment profile for a given project type.
 * Defaults to DOCKER profile for unknown types.
 */
export function getProfile(projectType: string): DeploymentProfile {
  return DEPLOYMENT_PROFILES[projectType.toUpperCase()] ?? DEPLOYMENT_PROFILES['DOCKER'];
}