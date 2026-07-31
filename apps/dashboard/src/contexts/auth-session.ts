// Custom hook for session restoration — extracted to keep auth-provider.tsx under 150 lines

import { useCallback, useEffect, useRef, useState } from 'react';
import { type FidscriptSDK } from '@fidscript-deploy/sdk';

import { makeSdk } from '@/lib/sdk';
import type { AuthState } from './auth-types';
import { getStoredTokens, storeTokens, clearTokens } from './auth-token-utils';

export function useAuthSession() {
  const [state, setState] = useState<AuthState>({
    user: null,
    loading: true,
    error: null,
  });

  const sdkRef = useRef<FidscriptSDK | null>(null);

  const buildSdk = useCallback((accessToken: string) => {
    sdkRef.current = makeSdk(accessToken);
  }, []);

  const hydrateUser = useCallback(async (accessToken: string) => {
    buildSdk(accessToken);
    return sdkRef.current!.auth.me();
  }, [buildSdk]);

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
        if (!cancelled && refreshToken) {
          try {
            const sdk = makeSdk();
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

  return { state, setState, sdkRef, buildSdk, hydrateUser };
}
