'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button, Card } from '@fidscript/ui';
import { HugeiconsIcon } from '@hugeicons/react';
import { ArrowLeftIcon, SaveIcon } from '@hugeicons/core-free-icons';
import { ToastProvider, useToast } from '@/components/toast-provider';
import { LoadingScreen } from '@/components/ui/loading-screen';
import { useAuth } from '@/contexts/auth-context';

interface BuildConfig {
  buildTarget?: string;
  startupTimeoutSeconds?: number;
}

const DEFAULT_CONFIG: BuildConfig = { buildTarget: '', startupTimeoutSeconds: 120 };

function mergeConfig(c: Partial<BuildConfig> | null | undefined): BuildConfig {
  if (!c) return DEFAULT_CONFIG;
  return {
    buildTarget: c.buildTarget ?? '',
    startupTimeoutSeconds: c.startupTimeoutSeconds ?? 120,
  };
}

export default function BuildConfigPage() {
  return (
    <ToastProvider>
      <BuildConfigInner />
    </ToastProvider>
  );
}

function BuildConfigInner() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.projectId as string;
  const { getSdk } = useAuth();
  const { showToast } = useToast();

  const [config, setConfig] = useState<BuildConfig>(DEFAULT_CONFIG);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const cfg = await getSdk().deployments.getBuildConfig(projectId);
      setConfig(mergeConfig(cfg));
      setDirty(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load build config');
    } finally {
      setLoading(false);
    }
  }, [projectId, getSdk]);

  useEffect(() => { void load(); }, [load]);

  async function handleSave() {
    setSaving(true);
    try {
      await getSdk().deployments.updateBuildConfig(projectId, config);
      showToast({ type: 'success', message: 'Build config saved.' });
      setDirty(false);
    } catch (err) {
      showToast({ type: 'error', message: err instanceof Error ? err.message : 'Save failed.' });
    } finally {
      setSaving(false);
    }
  }

  function update(patch: Partial<BuildConfig>) {
    setConfig(c => ({ ...c, ...patch }));
    setDirty(true);
  }

  if (loading) {
    return <LoadingScreen message="Loading build config" fullScreen={false} />;
  }

  return (
    <div className="px-3 sm:px-4 md:px-6 py-4 sm:py-6 space-y-4 sm:space-y-6 max-w-3xl">
      <Link href={`/projects/${projectId}`} className="inline-flex items-center gap-1.5 text-xs text-[var(--text-dim)] hover:text-[var(--text-muted)]">
        <HugeiconsIcon icon={ArrowLeftIcon} size={12} /> Back to Services
      </Link>
      <div>
        <h1 className="text-xl sm:text-2xl font-semibold text-[var(--text)]">Build config</h1>
        <p className="text-xs text-[var(--text-dim)] mt-1">
          Settings applied to every deployment of this project. Changes affect the next deploy.
        </p>
      </div>
      {error && (
        <Card className="border border-[var(--danger)] py-4 px-4">
          <p className="text-sm text-[var(--danger)]">{error}</p>
        </Card>
      )}
      <Card className="border border-[var(--rail)] p-4 sm:p-5 space-y-4">
        <Field label="Build target" hint="Monorepo app root relative to the repo (e.g. apps/web). Leave blank for single-package repos.">
          <input
            type="text" value={config.buildTarget ?? ''}
            onChange={e => update({ buildTarget: e.target.value })}
            placeholder="apps/web"
            className="w-full px-3 py-2 rounded-lg bg-[var(--surface-2)] border border-[var(--rail)] text-sm text-[var(--text)] placeholder:text-[var(--text-dim)] focus:outline-none focus:border-[var(--accent)]"
          />
        </Field>
        <Field label="Startup timeout (seconds)" hint="How long to wait for the container to become healthy before the deploy is marked failed.">
          <input
            type="number" min={5} max={600}
            value={config.startupTimeoutSeconds ?? 120}
            onChange={e => update({ startupTimeoutSeconds: Number(e.target.value) || 120 })}
            className="w-32 px-3 py-2 rounded-lg bg-[var(--surface-2)] border border-[var(--rail)] text-sm text-[var(--text)] focus:outline-none focus:border-[var(--accent)]"
          />
        </Field>
      </Card>
      <div className="flex items-center justify-end gap-2 pt-2">
        <Button variant="ghost" size="sm" onClick={() => router.push(`/projects/${projectId}`)}>Cancel</Button>
        <Button variant="primary" size="sm" onClick={handleSave} disabled={!dirty} loading={saving}>
          <HugeiconsIcon icon={SaveIcon} size={13} /> Save changes
        </Button>
      </div>
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">{label}</label>
      {children}
      {hint && <p className="text-[11px] text-[var(--text-dim)] leading-relaxed">{hint}</p>}
    </div>
  );
}