'use client';

import { useEffect, useState } from 'react';

export type ProjectMode = 'deploy' | 'baas';

const MODE_KEY = (id: string) => `fidscript.project.mode.${id}`;

function readMode(projectId: string): ProjectMode {
  if (typeof window === 'undefined') return 'deploy';
  const stored = localStorage.getItem(MODE_KEY(projectId));
  return stored === 'baas' ? 'baas' : 'deploy';
}

export function useProjectMode(projectId: string) {
  const [mode, setMode] = useState<ProjectMode>(() => readMode(projectId));

  useEffect(() => {
    if (!projectId || typeof window === 'undefined') return;
    try { localStorage.setItem(MODE_KEY(projectId), mode); } catch { /* */ }
  }, [mode, projectId]);

  return [mode, setMode] as const;
}
