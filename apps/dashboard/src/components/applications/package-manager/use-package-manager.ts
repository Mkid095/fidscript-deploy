'use client';

import { useCallback, useEffect, useState } from 'react';
import type { FidscriptSDK } from '@fidscript-deploy/sdk';

/** One package the registry holds. */
export interface RegistryPackage {
  name: string;
  version: string;
  description?: string;
}

export interface PackageManagerState {
  loading: boolean;
  registryUrl: string | null;
  tokenUrl: string | null;
  packages: RegistryPackage[];
  /** Whether the registry answered at all. */
  reachable: boolean;
  error: string | null;
}

/**
 * The package manager, as the operator sees it.
 *
 * The registry holds two kinds of package: the public ones, which anybody
 * may install, and the private scopes (@soostori, @nextmavens), which the
 * console hides until the visitor signs in. The list below is the public
 * half; the token page is how the rest is reached.
 */
export function usePackageManager(getSdk: () => FidscriptSDK): PackageManagerState {
  const [loading, setLoading] = useState(true);
  const [registryUrl, setRegistryUrl] = useState<string | null>(null);
  const [tokenUrl, setTokenUrl] = useState<string | null>(null);
  const [packages, setPackages] = useState<RegistryPackage[]>([]);
  const [reachable, setReachable] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const sdk = getSdk();
      const result = await sdk.applications.packageManager();
      setRegistryUrl(result.registryUrl);
      setTokenUrl(result.tokenUrl);
      setPackages(result.packages ?? []);
      setReachable(result.reachable);
      setError(null);
    } catch {
      setError('The package manager could not be read.');
    } finally {
      setLoading(false);
    }
  }, [getSdk]);

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { loading, registryUrl, tokenUrl, packages, reachable, error };
}
