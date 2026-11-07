'use client';

import { useCallback, useMemo, useState } from 'react';

import { parseEnvText } from '@/lib/deployment-source';
import type { EnvVarEntry } from './new-deployment-types';

/**
 * The environment variables of a deployment.
 *
 * Each one carries whether the build needs it. A variable marked required
 * stops the build when it is missing — so the operator finds out before the
 * build starts, not three hundred lines into a log.
 */
export function useEnvVars() {
  const [envVars, setEnvVars] = useState<EnvVarEntry[]>([]);

  /** The variables as the API takes them. */
  const envVarsRecord = useMemo(() => {
    const record: Record<string, string> = {};
    for (const entry of envVars) {
      if (entry.key.trim()) record[entry.key.trim()] = entry.value;
    }
    return record;
  }, [envVars]);

  /** The names of the variables the build cannot do without. */
  const requiredEnvVarNames = useMemo(
    () => envVars.filter(e => e.required && e.key.trim()).map(e => e.key.trim()),
    [envVars],
  );

  /** Read a .env block into the editor's list. */
  const loadEnvText = useCallback((text: string) => {
    const parsed = parseEnvText(text);
    setEnvVars(
      Object.entries(parsed).map(([key, value]) => ({ key, value, required: false })),
    );
  }, []);

  /** Add a blank row for a new variable. */
  const addVar = useCallback(() => {
    setEnvVars(prev => [...prev, { key: '', value: '', required: false }]);
  }, []);

  /** Change one variable. */
  const updateVar = useCallback((index: number, patch: Partial<EnvVarEntry>) => {
    setEnvVars(prev => prev.map((entry, i) => (i === index ? { ...entry, ...patch } : entry)));
  }, []);

  /** Remove one variable. */
  const removeVar = useCallback((index: number) => {
    setEnvVars(prev => prev.filter((_, i) => i !== index));
  }, []);

  return {
    envVars,
    setEnvVars,
    envVarsRecord,
    requiredEnvVarNames,
    loadEnvText,
    addVar,
    updateVar,
    removeVar,
  };
}
