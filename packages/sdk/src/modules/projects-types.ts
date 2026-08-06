export interface Project {
  id: string;
  name: string;
  slug: string;
  type: string;
  status: string;
  ownerId: string;
  role?: string;
  description?: string;
  lastActivityAt?: string;
  lastDeployAt?: string;
  region?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectMember {
  userId: string;
  email: string;
  role: string;
  joinedAt: string;
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
  ownerId: string;
  createdAt: string;
}

export interface EnvVar {
  key: string;
  value: string;
  encrypted: boolean;
}
