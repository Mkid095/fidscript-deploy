'use client';

import { useCallback, useEffect, useState } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  Alert02Icon,
  ArrowRight01Icon,
  HierarchyIcon,
  InformationCircleIcon,
} from '@hugeicons/core-free-icons';
import { Button } from '@fidscript/ui';
import { useAuth } from '@/contexts/auth-context';
import { useShellProjectId } from '@/contexts/project-context';
import { InstantAppCard } from './instant-app-card';
import { InstantUnavailable } from './instant-unavailable';
import type { InstantAppStatus } from './instant-types';

/**
 * The project's data plane.
 *
 * An application's tables, users, permissions and files live in Instant, not
 * in the platform. This is the operator's console for that link: it says
 * whether the project has an Instant app, provisions one, and hands over
 * what a deployed application needs to reach it.
 *
 * The query, realtime and permission APIs are Instant's own SDK — the
 * platform does not proxy them. See docs/CAPABILITY_OVERLAP.md.
 */
export function InstantPanel() {
  const { getSdk } = useAuth();
  const projectId = useShellProjectId();

  const [app, setApp] = useState<InstantAppStatus | null>(null);
  const [available, setAvailable] = useState(true);
  const [dashboardUrl, setDashboardUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [provisioning, setProvisioning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!projectId) return;
    try {
      const res = await getSdk().instant.get(projectId);
      setAvailable(res.available);
      setDashboardUrl(res.dashboardUrl ?? '');
      setApp(res.app);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not reach the Instant service.');
    } finally {
      setLoading(false);
    }
  }, [getSdk, projectId]);

  useEffect(() => {
    void load();
  }, [load]);

  const provision = useCallback(async () => {
    if (!projectId) return;
    setProvisioning(true);
    setError(null);
    try {
      await getSdk().instant.provision(projectId);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not provision the Instant app.');
    } finally {
      setProvisioning(false);
    }
  }, [getSdk, load, projectId]);

  if (!projectId) {
    return (
      <div className="flex items-center justify-center h-64 text-[var(--text-dim)]">
        <HugeiconsIcon icon={InformationCircleIcon} size={20} className="mr-2" />
        No project selected.
      </div>
    );
  }

  if (loading) {
    return (
      <div className="h-32 rounded-xl bg-[var(--surface-2)] border border-[var(--rail)] animate-pulse" />
    );
  }

  if (!available) {
    return <InstantUnavailable />;
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="flex items-start gap-2 rounded-lg border border-[var(--danger)] bg-[var(--surface-2)] px-3 py-2 text-xs text-[var(--danger)]">
          <HugeiconsIcon icon={Alert02Icon} size={14} className="mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {app ? (
        <InstantAppCard
          app={app}
          dashboardUrl={dashboardUrl}
          projectId={projectId}
          onDeleted={load}
        />
      ) : (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-14 h-14 rounded-xl bg-[var(--surface-2)] border border-[var(--rail)] flex items-center justify-center mb-4">
            <HugeiconsIcon icon={HierarchyIcon} size={24} className="text-[var(--text-dim)]" />
          </div>
          <h3 className="text-sm font-medium text-[var(--text)] mb-1">No Instant app yet</h3>
          <p className="text-xs text-[var(--text-dim)] max-w-sm">
            Provision one to give this project its data plane — its tables, its
            users and its permissions, enforced by Instant&apos;s rules.
          </p>
          <Button onClick={provision} disabled={provisioning} size="sm" className="mt-4 gap-1.5">
            <HugeiconsIcon icon={ArrowRight01Icon} size={13} />
            {provisioning ? 'Provisioning…' : 'Provision Instant app'}
          </Button>
        </div>
      )}
    </div>
  );
}
