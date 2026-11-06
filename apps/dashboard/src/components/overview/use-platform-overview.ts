'use client';

import { useCallback, useEffect, useState } from 'react';
import type { PlatformOverview } from '@fidscript-deploy/sdk';

import { useAuth } from '@/contexts/auth-context';

export interface PlatformOverviewState {
  overview: PlatformOverview | null;
  loading: boolean;
  error: string | null;
  reload: () => void;
}

/**
 * The platform overview, as the operator sees it.
 *
 * Every number comes from the platform's own overview endpoint, which counts
 * over **the caller's own projects**. Nothing here is a placeholder: if the
 * platform has no data, the page says so.
 */
export function usePlatformOverview(): PlatformOverviewState {
  const { getSdk } = useAuth();
  const [overview, setOverview] = useState<PlatformOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setOverview(await getSdk().overview.get());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'The overview could not be read.');
    } finally {
      setLoading(false);
    }
  }, [getSdk]);

  useEffect(() => {
    void load();
  }, [load]);

  return { overview, loading, error, reload: load };
}
