'use client';

import { createContext, useCallback, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { type FidscriptSDK } from '@fidscript-deploy/sdk';

import type { AuthContextValue } from './auth-types';
import { ACCESS_TOKEN_KEY, LEGACY_TOKEN_KEY } from './auth-token-utils';
import { useAuthSession } from './auth-session';
import {
  loginMethod,
  mfaChallengeMethod,
  verifyMagicCodeMethod,
  sendMagicCodeMethod,
  lookupAuthMethodMethod,
} from './auth-sign-in-methods';
import {
  logoutMethod,
  registerMethod,
  changePasswordMethod,
  forgotPasswordMethod,
} from './auth-account-methods';

export const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { state, setState, sdkRef, buildSdk, hydrateUser } = useAuthSession();

  /** Runs an auth call: the loading flag, the error, and the message. */
  const runAuthAction = useCallback(
    async <T,>(action: () => Promise<T>, fallback: string): Promise<T> => {
      setState(s => ({ ...s, loading: true, error: null }));
      try {
        const result = await action();
        setState(s => ({ ...s, loading: false, error: null }));
        return result;
      } catch (err) {
        const message = err instanceof Error ? err.message : fallback;
        setState(s => ({ ...s, loading: false, error: message }));
        throw err;
      }
    },
    [setState],
  );

  async function login(email: string, password: string): Promise<void> {
    const result = await runAuthAction(
      () => loginMethod(email, password, sdkRef, buildSdk),
      'Login failed',
    );
    // An account with a second factor has no session yet — nothing to hydrate.
    if (result?.mfaRequired) return;
    const user = await sdkRef.current!.auth.me();
    setState({ user, loading: false, error: null });
  }

  /** Finishes a sign-in that stopped at the second factor. */
  async function mfaChallenge(code: string): Promise<void> {
    await runAuthAction(
      () => mfaChallengeMethod(code, sdkRef, buildSdk),
      'That code was not accepted',
    );
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
    setupPassword: string,
    firstName: string,
    lastName: string,
  ): Promise<void> {
    await runAuthAction(
      () => registerMethod(email, name, password, authMethod, setupPassword, firstName, lastName,
        sendMagicCode, login),
      'Registration failed',
    );
  }

  async function lookupAuthMethod(email: string): Promise<'PASSWORD' | 'MAGIC_CODE' | null> {
    return lookupAuthMethodMethod(email);
  }

  async function sendMagicCode(email: string): Promise<{ sent: boolean }> {
    return sendMagicCodeMethod(email);
  }

  async function verifyMagicCode(email: string, code: string): Promise<void> {
    await runAuthAction(
      () => verifyMagicCodeMethod(email, code, sdkRef, buildSdk),
      'Invalid or expired code',
    );
    const user = await sdkRef.current!.auth.me();
    setState({ user, loading: false, error: null });
  }

  async function changePassword(currentPassword: string, newPassword: string): Promise<void> {
    await runAuthAction(
      () => changePasswordMethod(currentPassword, newPassword, sdkRef, hydrateUser),
      'Password change failed',
    );
  }

  async function forgotPassword(email: string): Promise<void> {
    await runAuthAction(() => forgotPasswordMethod(email), 'Failed to send reset email');
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
        mfaChallenge,
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
