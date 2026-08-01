'use client';

import { createContext, useCallback, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { type FidscriptSDK } from '@fidscript-deploy/sdk';

import type { AuthContextValue } from './auth-types';
import { ACCESS_TOKEN_KEY, LEGACY_TOKEN_KEY } from './auth-token-utils';
import { useAuthSession } from './auth-session';
import {
  loginMethod,
  logoutMethod,
  registerMethod,
  lookupAuthMethodMethod,
  sendMagicCodeMethod,
  verifyMagicCodeMethod,
  changePasswordMethod,
  forgotPasswordMethod,
} from './auth-methods';

export const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { state, setState, sdkRef, buildSdk, hydrateUser } = useAuthSession();

  async function login(email: string, password: string): Promise<void> {
    setState(s => ({ ...s, loading: true, error: null }));
    try {
      await loginMethod(email, password, sdkRef, buildSdk);
      const user = await sdkRef.current!.auth.me();
      setState({ user, loading: false, error: null });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Login failed';
      setState(s => ({ ...s, loading: false, error: message }));
      throw err;
    }
  }

  async function logout(): Promise<void> {
    await logoutMethod(sdkRef);
    setState({ user: null, loading: false, error: null });
    router.push('/login');
  }

  async function register(
    email: string,
    name: string,
    password: string,
    authMethod: 'PASSWORD' | 'MAGIC_CODE',
  ): Promise<void> {
    setState(s => ({ ...s, loading: true, error: null }));
    try {
      await registerMethod(email, name, password, authMethod, sendMagicCode, login);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Registration failed';
      setState(s => ({ ...s, loading: false, error: message }));
      throw err;
    }
  }

  async function lookupAuthMethod(email: string): Promise<'PASSWORD' | 'MAGIC_CODE' | null> {
    return lookupAuthMethodMethod(email);
  }

  async function sendMagicCode(email: string): Promise<{ sent: boolean }> {
    return sendMagicCodeMethod(email);
  }

  async function verifyMagicCode(email: string, code: string): Promise<void> {
    setState(s => ({ ...s, loading: true, error: null }));
    try {
      await verifyMagicCodeMethod(email, code, sdkRef, buildSdk);
      const user = await sdkRef.current!.auth.me();
      setState({ user, loading: false, error: null });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Invalid or expired code';
      setState(s => ({ ...s, loading: false, error: message }));
      throw err;
    }
  }

  async function changePassword(currentPassword: string, newPassword: string): Promise<void> {
    setState(s => ({ ...s, loading: true, error: null }));
    try {
      await changePasswordMethod(currentPassword, newPassword, sdkRef, hydrateUser);
      setState(s => ({ ...s, loading: false, error: null }));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Password change failed';
      setState(s => ({ ...s, loading: false, error: message }));
      throw err;
    }
  }

  async function forgotPassword(email: string): Promise<void> {
    setState(s => ({ ...s, loading: true, error: null }));
    try {
      await forgotPasswordMethod(email);
      setState(s => ({ ...s, loading: false, error: null }));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to send reset email';
      setState(s => ({ ...s, loading: false, error: message }));
      throw err;
    }
  }

  function clearError() {
    setState(s => ({ ...s, error: null }));
  }

  const getSdk = useCallback(function getSdk(): FidscriptSDK {
    if (sdkRef.current) return sdkRef.current;
    throw new Error('Not authenticated — SDK not initialized. Did session restore complete?');
  }, [sdkRef]);

  const getToken = useCallback(function getToken(): string | null {
    return localStorage.getItem(ACCESS_TOKEN_KEY) ?? localStorage.getItem(LEGACY_TOKEN_KEY);
  }, []);

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
        forgotPassword,
        clearError,
        getSdk,
        getToken,
        lookupAuthMethod,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
