'use client';

// Backwards-compatibility barrel — re-export everything from the new split files
export { AuthProvider } from './auth-provider';
export { useAuth } from './use-auth';
export type { AuthState, AuthContextValue } from './auth-types';
export {
  ACCESS_TOKEN_KEY,
  REFRESH_TOKEN_KEY,
  LEGACY_TOKEN_KEY,
} from './auth-token-utils';
