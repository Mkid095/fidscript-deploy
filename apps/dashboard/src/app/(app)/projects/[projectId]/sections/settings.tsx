'use client';

import { useEffect, useState } from 'react';
import { Card, Button, Spinner } from '@fidscript/ui';

import { useAuth } from '@/contexts/auth-context';
import type { Project, EnvVar } from '@/types';

interface Props { project: Project }

export function SettingsSection({ project }: Props) {
  const { getSdk } = useAuth();
  const [envVars, setEnvVars] = useState<EnvVar[]>([]);
  const [loading, setLoading] = useState(true);
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const data = await getSdk().projects.getEnvVars(project.id);
        if (!cancelled) setEnvVars(Array.isArray(data) ? data : []);
      } catch {
        // env vars may not exist yet
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [project.id, getSdk]);

  function toggleReveal(key: string) {
    setRevealed(prev => ({ ...prev, [key]: !prev[key] }));
  }

  return (
    <div className="flex flex-col gap-8 max-w-2xl">
      {/* Env vars */}
      <div>
        <h3 className="text-sm font-semibold text-slate-200 mb-3">Environment Variables</h3>
        {loading ? (
          <Spinner size="md" />
        ) : envVars.length === 0 ? (
          <p className="text-sm text-slate-500">No environment variables set.</p>
        ) : (
          <div className="flex flex-col gap-1">
            {envVars.map(env => (
              <div
                key={env.key}
                className="flex items-center gap-3 px-3 py-2 bg-[#0f1117] border border-[#1e2130] rounded-md text-xs font-mono"
              >
                <span className="text-slate-400 min-w-40">{env.key}</span>
                <span className="text-slate-200 flex-1 break-all">
                  {env.encrypted && !revealed[env.key] ? '••••••••' : env.value}
                </span>
                {env.encrypted && (
                  <button
                    onClick={() => toggleReveal(env.key)}
                    className="bg-none border-none text-slate-500 cursor-pointer text-xs hover:text-slate-300 flex-shrink-0"
                  >
                    {revealed[env.key] ? 'Hide' : 'Reveal'}
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Danger zone */}
      <div>
        <h3 className="text-sm font-semibold text-red-400 mb-3">Danger Zone</h3>
        <Card className="border border-red-500/30 py-4 px-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-slate-200">Delete Project</p>
              <p className="text-xs text-slate-500">
                Permanently delete this project and all its resources. This cannot be undone.
              </p>
            </div>
            <Button variant="danger" size="sm">Delete</Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
