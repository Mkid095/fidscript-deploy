// User types

export interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  mfaEnabled: boolean;
  mustChangePassword: boolean;
  createdAt: string;
  credentials?: Array<{ type: 'PASSWORD' | 'MAGIC_CODE' | 'PASSKEY' }>;
}

export interface ProjectMember {
  userId: string;
  email: string;
  role: string;
  joinedAt: string;
}
