'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { createFidscript, type FidscriptSDK } from '@fidscript/sdk';

import type { User } from '@/types';

interface AuthState {
  user: User | null;
  loading: boolean;
  error: string | null;
}

interface AuthContextValue extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  register: (email: string, name: string, password: string) => Promise<void>;
  sendMagicCode: (email: string) => Promise<{ sent: boolean }>;
  verifyMagicCode: (email: string, code: string) => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  clearError: () => void;
  /** Returns an SDK instance authenticated with the current access token. */
  getSdk: () => FidscriptSDK;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const ACCESS_TOKEN_KEY = 'fidscript_access_token';
const REFRESH_TOKEN_KEY = 'fidscript_refresh_token';

function getStoredTokens(): { accessToken: string | null; refreshToken: string | null } {
  if (typeof window === 'undefined') return { accessToken: null, refreshToken: null };
  return {
    accessToken: localStorage.getItem(ACCESS_TOKEN_KEY),
    refreshToken: localStorage.getItem(REFRESH_TOKEN_KEY),
  };
}

function storeTokens(accessToken: string, refreshToken: string): void {
  localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
  localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
}

function clearTokens(): void {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
}

function getNextRoute(): string {
  if (typeof window === 'undefined') return '/dashboard';
  const params = new URLSearchParams(window.location.search);
  return params.get('next') || '/dashboard';
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    loading: true,
    error: null,
  });

  const sdkRef = useRef<FidscriptSDK | null>(null);

  const buildSdk = useCallback((accessToken: string) => {
    sdkRef.current = createFidscript({ apiKey: accessToken });
  }, []);

  const hydrateUser = useCallback(async (accessToken: string) => {
    buildSdk(accessToken);
    return sdkRef.current!.auth.me();
  }, [buildSdk]);

  // Restore session on mount.
  useEffect(() => {
    let cancelled = false;

    async function restoreSession() {
      const { accessToken, refreshToken } = getStoredTokens();
      if (!accessToken) {
        if (!cancelled) setState(s => ({ ...s, loading: false }));
        return;
      }

      try {
        const user = await hydrateUser(accessToken);
        if (!cancelled) setState({ user, loading: false, error: null });
      } catch {
        // Token may be expired — attempt refresh.
        if (!cancelled && refreshToken) {
          try {
            const sdk = createFidscript({});
            const refreshed = await sdk.auth.refreshToken(refreshToken);
            if (cancelled) return;
            storeTokens(refreshed.accessToken, refreshed.refreshToken);
            const user = await hydrateUser(refreshed.accessToken);
            if (!cancelled) setState({ user, loading: false, error: null });
          } catch {
            if (!cancelled) {
              clearTokens();
              setState({ user: null, loading: false, error: null });
            }
          }
        } else {
          if (!cancelled) {
            clearTokens();
            setState({ user: null, loading: false, error: null });
          }
        }
      }
    }

    restoreSession();
    return () => { cancelled = true; };
  }, [hydrateUser]);

  async function login(email: string, password: string): Promise<void> {
    setState(s => ({ ...s, loading: true, error: null }));
    try {
      const sdk = createFidscript({});
      const res = await sdk.auth.login(email, password);
      storeTokens(res.accessToken, res.refreshToken);
      buildSdk(res.accessToken);
      const user = await sdkRef.current!.auth.me();
      setState({ user, loading: false, error: null });
      window.location.href = getNextRoute();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Login failed';
      setState(s => ({ ...s, loading: false, error: message }));
      throw err;
    }
  }

  async function logout(): Promise<void> {
    try {
      if (sdkRef.current) await sdkRef.current.auth.logout();
    } finally {
      clearTokens();
      sdkRef.current = null;
      setState({ user: null, loading: false, error: null });
      window.location.href = '/login';
    }
  }

  async function register(email: string, name: string, password: string): Promise<void> {
    setState(s => ({ ...s, loading: true, error: null }));
    try {
      const sdk = createFidscript({});
      await sdk.auth.register(email, password, name);
      await login(email, password);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Registration failed';
      setState(s => ({ ...s, loading: false, error: message }));
      throw err;
    }
  }

  async function sendMagicCode(email: string): Promise<{ sent: boolean }> {
    const sdk = createFidscript({});
    return sdk.auth.sendMagicCode(email);
  }

  async function verifyMagicCode(email: string, code: string): Promise<void> {
    setState(s => ({ ...s, loading: true, error: null }));
    try {
      const sdk = createFidscript({});
      const res = await sdk.auth.verifyMagicCode(email, code);
      storeTokens(res.accessToken, res.refreshToken);
      buildSdk(res.accessToken);
      const user = await sdkRef.current!.auth.me();
      setState({ user, loading: false, error: null });
      window.location.href = getNextRoute();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Invalid or expired code';
      setState(s => ({ ...s, loading: false, error: message }));
      throw err;
    }
  }

  async function changePassword(currentPassword: string, newPassword: string): Promise<void> {
    setState(s => ({ ...s, loading: true, error: null }));
    try {
      if (!sdkRef.current) throw new Error('Not authenticated');
      const res = await sdkRef.current.auth.changePassword(currentPassword, newPassword);
      storeTokens(res.accessToken, res.refreshToken);
      const user = await hydrateUser(res.accessToken);
      setState({ user, loading: false, error: null });
      window.location.href = getNextRoute();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Password change failed';
      setState(s => ({ ...s, loading: false, error: message }));
      throw err;
    }
  }

  function clearError() {
    setState(s => ({ ...s, error: null }));
  }

  function getSdk(): FidscriptSDK {
    if (sdkRef.current) return sdkRef.current;
    // Fallback: build from stored token (for pages that mount after hydration).
    const { accessToken } = getStoredTokens();
    if (!accessToken) throw new Error('Not authenticated');
    const sdk = createFidscript({ apiKey: accessToken });
    sdkRef.current = sdk;
    return sdk;
  }

  return (
    <AuthContext.Provider
      value={{
        ...state,
        login,
        logout,
        register,
        sendMagicCode,
        verifyMagicCode,
        changePassword,
        clearError,
        getSdk,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within <AuthProvider>');
  return ctx;
}
