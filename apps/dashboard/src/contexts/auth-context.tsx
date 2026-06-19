'use client';

import {
  createContext,
  useContext,
  useEffect,
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
}

const AuthContext = createContext<AuthContextValue | null>(null);

const TOKEN_KEY = 'fidscript_token';

function getStoredToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_KEY);
}

function storeToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    loading: true,
    error: null,
  });

  const [sdk, setSdk] = useState<FidscriptSDK | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function restoreSession() {
      const token = getStoredToken();
      if (!token) {
        if (!cancelled) setState(s => ({ ...s, loading: false }));
        return;
      }

      try {
        const sdkInstance = createFidscript({ apiKey: token });
        const res = await sdkInstance.auth.getSession();
        if (!cancelled) {
          setSdk(sdkInstance);
          setState({ user: res.user, loading: false, error: null });
        }
      } catch {
        clearToken();
        if (!cancelled) setState({ user: null, loading: false, error: null });
      }
    }

    restoreSession();

    return () => {
      cancelled = true;
    };
  }, []);

  async function login(email: string, password: string): Promise<void> {
    setState(s => ({ ...s, loading: true, error: null }));
    try {
      const sdkInstance = createFidscript({});
      const res = await sdkInstance.auth.login(email, password);
      storeToken(res.token);
      setSdk(sdkInstance);
      setState({ user: res.user, loading: false, error: null });
      window.location.href = '/';
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Login failed';
      setState(s => ({ ...s, loading: false, error: message }));
    }
  }

  async function logout(): Promise<void> {
    try {
      if (sdk) await sdk.auth.logout();
    } finally {
      clearToken();
      setSdk(null);
      setState({ user: null, loading: false, error: null });
      window.location.href = '/login';
    }
  }

  async function register(email: string, name: string, password: string): Promise<void> {
    setState(s => ({ ...s, loading: true, error: null }));
    try {
      const sdkInstance = createFidscript({});
      await sdkInstance.auth.register(email, password, name);
      await login(email, password);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Registration failed';
      setState(s => ({ ...s, loading: false, error: message }));
    }
  }

  return (
    <AuthContext.Provider value={{ ...state, login, logout, register }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within <AuthProvider>');
  return ctx;
}
