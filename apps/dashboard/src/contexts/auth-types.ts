import type { User } from '@/types';
import type { FidscriptSDK } from '@fidscript-deploy/sdk';

export interface AuthState {
  user: User | null;
  loading: boolean;
  error: string | null;
}

export interface AuthContextValue extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  register: (email: string, name: string, password: string, authMethod: 'PASSWORD' | 'MAGIC_CODE') => Promise<void>;
  sendMagicCode: (email: string) => Promise<{ sent: boolean }>;
  verifyMagicCode: (email: string, code: string) => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  forgotPassword: (email: string) => Promise<void>;
  clearError: () => void;
  /** Returns an SDK instance authenticated with the current access token. */
  getSdk: () => FidscriptSDK;
  /** Returns the current access token, or null if not authenticated. */
  getToken: () => string | null;
  /** Look up a user's preferred auth method by email (used on login page before credentials). */
  lookupAuthMethod: (email: string) => Promise<'PASSWORD' | 'MAGIC_CODE' | null>;
}
