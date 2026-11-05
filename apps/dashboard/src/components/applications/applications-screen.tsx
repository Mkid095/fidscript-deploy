'use client';

import { useCallback, useEffect, useState } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import { Alert02Icon, InformationCircleIcon } from '@hugeicons/core-free-icons';
import type { Application, InstallJob } from '@fidscript-deploy/sdk';
import { useAuth } from '@/contexts/auth-context';
import { ApplicationCard } from './application-card';
import { InstallLog } from './install-log';

const POLL_MS = 3000;

/**
 * The applications on this platform.
 *
 * The operator arrives here: the deployment engine and the mail server are
 * part of the platform, and the rest are installed from this screen — one at
 * a time, by their choice. An installed application opens on its own
 * subdomain.
 */
export function ApplicationsScreen() {
  const { getSdk, user } = useAuth();
  const [applications, setApplications] = useState<Application[]>([]);
  const [installs, setInstalls] = useState<InstallJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // The same check the rest of the dashboard uses (owner or admin), and the
  // API re-checks it — the button is a hint, not the gate.
  const role = user?.role?.toLowerCase();
  const canInstall = role === 'owner' || role === 'admin';

  const load = useCallback(async () => {
    try {
      const [catalogue, jobs] = await Promise.all([
        getSdk().applications.list(),
        getSdk().applications.installs(),
      ]);
      setApplications(catalogue.applications);
      setInstalls(jobs.installs);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load the applications.');
    } finally {
      setLoading(false);
    }
  }, [getSdk]);

  useEffect(() => {
    void load();
  }, [load]);

  // While something is installing, keep watching — an install brings
  // containers up and can take minutes.
  const running = installs.some((job) => job.status === 'running');
  useEffect(() => {
    if (!running) return;
    const timer = setInterval(() => void load(), POLL_MS);
    return () => clearInterval(timer);
  }, [running, load]);

  const startInstall = useCallback(
    async (id: string) => {
      setError(null);
      try {
        await getSdk().applications.install(id);
        await load();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not start the install.');
      }
    },
    [getSdk, load],
  );

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div
            key={i}
            className="h-32 rounded-xl bg-[var(--surface-2)] border border-[var(--rail)] animate-pulse"
          />
        ))}
      </div>
    );
  }

  const latest = new Map<string, InstallJob>();
  for (const job of installs) {
    if (!latest.has(job.applicationId)) latest.set(job.applicationId, job);
  }
  const active = installs.find((job) => job.status === 'running');

  return (
    <div className="space-y-6">
      {error && (
        <div className="flex items-start gap-2 rounded-lg border border-[var(--danger)] bg-[var(--surface-2)] px-3 py-2 text-xs text-[var(--danger)]">
          <HugeiconsIcon icon={Alert02Icon} size={14} className="mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {active && <InstallLog install={active} />}

      {applications.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <HugeiconsIcon icon={InformationCircleIcon} size={24} className="text-[var(--text-dim)] mb-3" />
          <p className="text-xs text-[var(--text-dim)]">No applications found.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {applications.map((application) => (
            <ApplicationCard
              key={application.id}
              application={application}
              install={latest.get(application.id) ?? null}
              canInstall={canInstall}
              onInstall={startInstall}
            />
          ))}
        </div>
      )}
    </div>
  );
}
