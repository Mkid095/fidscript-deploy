// Step 3: Review — summary + deploy

import Link from 'next/link';
import { Card } from '@fidscript/ui';
import { HugeiconsIcon } from '@hugeicons/react';

import type { SourceType } from './new-deploy-utils';
import { formatBytes } from './new-deploy-utils';

interface StepReviewProps {
  sourceType: SourceType;
  gitUrl: string;
  selectedRepo: { full_name: string } | null;
  effectiveBranch: string;
  archiveFile: File | null;
  dockerfilePath: string;
  parsedEnvVars: Record<string, string>;
  buildPlan: { frameworkLabel: string; frameworkVersion?: string } | null;
  autoDeploy: boolean;
  onAutoDeployChange: (v: boolean) => void;
  onProjectSlug: string;
}

export function StepReview({
  sourceType,
  gitUrl,
  selectedRepo,
  effectiveBranch,
  archiveFile,
  dockerfilePath,
  parsedEnvVars,
  buildPlan,
  autoDeploy,
  onAutoDeployChange,
  onProjectSlug,
}: StepReviewProps) {
  return (
    <Card className="border border-[var(--rail)] p-5">
      <h2 className="text-sm font-semibold text-[var(--text)] mb-4">Review & deploy</h2>
      <dl className="space-y-3">
        <ReviewRow label="Source type" value={sourceType === 'git' ? 'Git repository' : 'Archive upload'} />
        {sourceType === 'git' ? (
          <>
            <ReviewRow label="Repository" value={selectedRepo?.full_name ?? gitUrl} mono />
            <ReviewRow label="Branch" value={effectiveBranch || 'main'} mono />
          </>
        ) : (
          <>
            <ReviewRow label="Archive" value={archiveFile?.name ?? '—'} />
            <ReviewRow label="Size" value={archiveFile ? formatBytes(archiveFile.size) : '—'} />
          </>
        )}
        <ReviewRow label="Framework" value={buildPlan ? `${buildPlan.frameworkLabel}${buildPlan.frameworkVersion ? ' ' + buildPlan.frameworkVersion : ''}` : 'Auto-detect'} />
        {dockerfilePath.trim() && <ReviewRow label="Dockerfile" value={dockerfilePath} mono />}
        <ReviewRow label="Env variables" value={Object.keys(parsedEnvVars).length > 0 ? `${Object.keys(parsedEnvVars).length} set` : 'None'} />
        <div className="pt-3 border-t border-[var(--rail)] mt-1">
          <dt className="text-xs text-[var(--text-muted)] mb-1">Deployment URL (after success)</dt>
          <dd className="text-sm font-mono text-[var(--accent)]">
            https://{onProjectSlug}.apps.{process.env.NEXT_PUBLIC_PLATFORM_DOMAIN ?? 'deploy.fidscript.com'}
          </dd>
        </div>
        {sourceType === 'git' && (
          <div className="pt-3 border-t border-[var(--rail)] mt-1 flex items-center justify-between gap-3">
            <div>
              <dt className="text-xs text-[var(--text-muted)] font-medium">Auto-deploy on push</dt>
              <dd className="text-[10px] text-[var(--text-dim)] mt-0.5">New commits to this branch will automatically trigger a deployment.</dd>
            </div>
            <ToggleSwitch checked={autoDeploy} onChange={onAutoDeployChange} />
          </div>
        )}
      </dl>
      <div className="mt-5 pt-4 border-t border-[var(--rail)]">
        <p className="text-xs text-[var(--text-muted)]">
          The deployment will build and start automatically once queued. You can edit environment variables anytime in{' '}
          <Link href={`/projects/${onProjectSlug}/settings`} className="text-[var(--accent)] hover:underline">project settings</Link>.
        </p>
      </div>
    </Card>
  );
}

function ReviewRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <dt className="text-xs text-[var(--text-muted)] flex-shrink-0 pt-0.5">{label}</dt>
      <dd className={`text-sm text-[var(--text)] text-right min-w-0 truncate ${mono ? 'font-mono' : ''}`}>{value}</dd>
    </div>
  );
}

function ToggleSwitch({ checked, onChange, disabled }: { checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-5 w-9 flex-shrink-0 rounded-full transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--danger)]/40 ${
        checked ? 'bg-[var(--danger)]' : 'bg-[var(--rail-light)]'
      } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
    >
      <span className={`inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform duration-200 mt-0.5 ${
        checked ? 'translate-x-4' : 'translate-x-0.5'
      }`} />
    </button>
  );
}
