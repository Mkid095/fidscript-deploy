'use client';

import { useCallback, useEffect, useState } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import { ArrowUpRight01Icon, Delete01Icon, Link01Icon } from '@hugeicons/core-free-icons';
import { Button } from '@fidscript/ui';
import { useAuth } from '@/contexts/auth-context';
import { InstantClientConfigBlock } from './instant-client-config';
import { InstantDeleteConfirmation } from './instant-delete-confirmation';
import type { InstantAppStatus, InstantClientConfig } from './instant-types';

interface InstantAppCardProps {
  app: InstantAppStatus;
  dashboardUrl: string;
  projectId: string;
  onDeleted: () => Promise<void> | void;
}

/**
 * The project's Instant app: what it is, what a deployed application needs to
 * reach it, and how to get to the console where its schema, permissions and
 * users are managed.
 */
export function InstantAppCard({ app, dashboardUrl, projectId, onDeleted }: InstantAppCardProps) {
  const { getSdk } = useAuth();
  const [config, setConfig] = useState<InstantClientConfig | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getSdk()
      .instant.clientConfig(projectId)
      .then((c) => {
        if (!cancelled) setConfig(c);
      })
      .catch(() => {
        // The app exists but the config could not be read — the card is
        // still useful, so this is not an error the operator must act on.
      });
    return () => {
      cancelled = true;
    };
  }, [getSdk, projectId]);

  const remove = useCallback(async () => {
    setDeleting(true);
    setError(null);
    try {
      await getSdk().instant.unlink(projectId);
      setConfirming(false);
      await onDeleted();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not delete the Instant app.');
      setConfirming(false);
    } finally {
      setDeleting(false);
    }
  }, [getSdk, onDeleted, projectId]);

  return (
    <div className="space-y-4">
      {error && (
        <p className="rounded-lg border border-[var(--danger)] bg-[var(--surface-2)] px-3 py-2 text-xs text-[var(--danger)]">
          {error}
        </p>
      )}

      <div className="rounded-xl border border-[var(--rail)] bg-[var(--surface)] p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h3 className="text-sm font-medium text-[var(--text)] truncate">{app.title}</h3>
            <p className="text-xs text-[var(--text-dim)] mt-0.5 font-mono truncate">{app.appId}</p>
          </div>
          <span className="shrink-0 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-[11px] text-emerald-400">
            {app.status}
          </span>
        </div>

        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="rounded-lg border border-[var(--rail)] bg-[var(--surface-2)] p-3">
            <p className="text-[11px] uppercase tracking-wide text-[var(--text-dim)]">Created</p>
            <p className="text-xs text-[var(--text)] mt-1">
              {new Date(app.createdAt).toLocaleDateString()}
            </p>
          </div>
          <div className="rounded-lg border border-[var(--rail)] bg-[var(--surface-2)] p-3">
            <p className="text-[11px] uppercase tracking-wide text-[var(--text-dim)]">API host</p>
            <p className="text-xs text-[var(--text)] mt-1 font-mono truncate">
              {config?.apiHost ?? '—'}
            </p>
          </div>
        </div>

        {config && <InstantClientConfigBlock config={config} />}

        <div className="mt-4 flex flex-wrap items-center gap-2">
          {dashboardUrl && (
            <a
              href={dashboardUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--rail)] px-3 py-1.5 text-xs text-[var(--text)] hover:bg-[var(--surface-2)] transition-colors"
            >
              <HugeiconsIcon icon={Link01Icon} size={13} />
              Open Instant console
              <HugeiconsIcon icon={ArrowUpRight01Icon} size={12} />
            </a>
          )}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setConfirming(true)}
            className="gap-1.5 text-rose-400 hover:bg-rose-500/10"
          >
            <HugeiconsIcon icon={Delete01Icon} size={13} />
            Delete app
          </Button>
        </div>
      </div>

      {confirming && (
        <InstantDeleteConfirmation
          title={app.title}
          deleting={deleting}
          onCancel={() => setConfirming(false)}
          onConfirm={remove}
        />
      )}
    </div>
  );
}
