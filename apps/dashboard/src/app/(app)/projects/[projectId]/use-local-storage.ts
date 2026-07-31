'use client';

import { useEffect, useState, useCallback } from 'react';

export function useLocalStorage(key: string, fallback: boolean) {
  const [value, setValue] = useState(fallback);
  useEffect(() => {
    try {
      const stored = localStorage.getItem(key);
      if (stored !== null) setValue(stored === 'true');
    } catch {}
  }, [key]);
  const set = useCallback((v: boolean) => {
    setValue(v);
    try { localStorage.setItem(key, String(v)); } catch {}
  }, [key]);
  return [value, set] as const;
}
