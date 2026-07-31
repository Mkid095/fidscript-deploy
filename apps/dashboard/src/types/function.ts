// Function and API key types

export interface Function_ {
  id: string;
  name: string;
  runtime: string;
  status: 'ACTIVE' | 'INACTIVE' | 'BUILDING' | 'DEPLOYING' | 'FAILED' | string;
  projectId?: string;
  createdAt: string;
  currentVersion?: string;
  envVars?: Record<string, string>;
  memoryMb?: number;
  timeoutSeconds?: number;
  entryPoint?: string;
  settings?: Record<string, unknown>;
  invokedCount?: number;
  avgDuration?: number;
  lastInvokedAt?: string | null;
}

export interface ApiKey {
  id: string;
  name: string;
  createdAt: string;
}
