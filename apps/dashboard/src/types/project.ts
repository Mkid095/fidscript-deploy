// Project types

export interface Project {
  id: string;
  name: string;
  slug: string;
  type: string;
  status: string;
  ownerId: string;
  role?: string; // 'owner' | 'admin' | 'developer' | 'viewer'
  description?: string;
  lastActivityAt?: string;
  lastDeployAt?: string;
  region?: string;
  deploymentStrategy?: string;
  subdomain?: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
}

export interface EnvVar {
  key: string;
  value: string;
  encrypted: boolean;
}
