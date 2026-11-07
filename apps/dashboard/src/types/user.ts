// User types

export interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  mfaEnabled: boolean;
  mustChangePassword: boolean;
  /** When the first-time journey was finished — null when it has not been. */
  onboardedAt?: string | null;
  createdAt: string;
  credentials?: Array<{ type: 'PASSWORD' | 'MAGIC_CODE' | 'PASSKEY' }>;
}

export interface ProjectMember {
  userId: string;
  email: string;
  role: string;
  joinedAt: string;
}
