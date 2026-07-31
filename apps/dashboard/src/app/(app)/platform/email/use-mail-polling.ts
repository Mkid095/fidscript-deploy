'use client';

import { useEffect } from 'react';

export function useMailPolling(loadFn: () => void, intervalMs = 5_000) {
  useEffect(() => {
    const id = setInterval(loadFn, intervalMs);
    return () => clearInterval(id);
  }, [loadFn, intervalMs]);
}
