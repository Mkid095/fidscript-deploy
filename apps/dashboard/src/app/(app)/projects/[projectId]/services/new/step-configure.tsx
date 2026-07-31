// Step 2: Configure — framework detection, env vars, advanced settings

import { Card } from '@fidscript/ui';
import { HugeiconsIcon } from '@hugeicons/react';
import { Settings01Icon, ArrowRight01Icon } from '@hugeicons/core-free-icons';

import type { SourceType, BuildPlan } from './new-deploy-utils';
import { BuildPreview } from './build-preview';
import { EnvVarsSection } from './env-vars-section';

interface StepConfigureProps {
  sourceType: SourceType;
  gitUrl: string;
  branch: string;
  repoName: string;
  dockerfilePath: string;
  credentials: string;
  selectedRepo: { full_name: string } | null;
  buildPlan: BuildPlan | null;
  detecting: boolean;
  detectError: string | null;
  envText: string;
  showAdvanced: boolean;
  onDockerfileChange: (v: string) => void;
  onCredentialsChange: (v: string) => void;
  onEnvTextChange: (v: string) => void;
  onToggleAdvanced: () => void;
  onRunDetection: () => void;
  onProjectSlug: string;
  parsedEnvVars: Record<string, string>;
}

export function StepConfigure({
  sourceType,
  gitUrl,
  branch,
  repoName,
  dockerfilePath,
  credentials,
  selectedRepo,
  buildPlan,
  detecting,
  detectError,
  envText,
  showAdvanced,
  onDockerfileChange,
  onCredentialsChange,
  onEnvTextChange,
  onToggleAdvanced,
  onRunDetection,
  onProjectSlug,
  parsedEnvVars,
}: StepConfigureProps) {
  return (
    <Card className="border border-[var(--rail)] p-5 space-y-5">
      {/* Framework detection */}
      <FrameworkDetection sourceType={sourceType} buildPlan={buildPlan} detecting={detecting}
        detectError={detectError} onRunDetection={onRunDetection} />

      {/* Environment variables */}
      <div>
        <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5 uppercase tracking-wider">
          Environment variables <span className="text-[var(--text-dim)] normal-case font-normal">(optional)</span>
        </label>
        <textarea value={envText} onChange={e => onEnvTextChange(e.target.value)}
          placeholder={'DATABASE_URL=postgres://...\nAPI_SECRET=your-secret-here\n# Comments are ignored\nNEXT_PUBLIC_API_URL=https://...'}
          rows={6}
          className="w-full rounded-md bg-[var(--surface-2)] border border-[var(--rail)] text-[var(--text)] text-xs font-mono px-3 py-2.5 resize-y focus:outline-none focus:border-[var(--danger)]/40 placeholder:text-[var(--text-dim)]"
          spellCheck={false} />
        {Object.keys(parsedEnvVars).length > 0 && (
          <div className="mt-2 flex items-center gap-1.5 text-xs text-[var(--success)]">
            <HugeiconsIcon icon={CheckmarkCircle02Icon} size={12} />
            {Object.keys(parsedEnvVars).length} variable{Object.keys(parsedEnvVars).length === 1 ? '' : 's'} ready
          </div>
        )}
        <p className="text-[10px] text-[var(--text-dim)] mt-1.5">
          Also configurable in <Link href={`/projects/${onProjectSlug}/settings`} className="text-[var(--accent)] hover:underline">project settings</Link>.
        </p>
      </div>

      {/* Advanced settings */}
      <div className="border-t border-[var(--rail)] pt-4">
        <button type="button" onClick={onToggleAdvanced}
          className="flex items-center gap-1.5 text-xs text-[var(--text-muted)] hover:text-[var(--text-muted)] transition-colors">
          <HugeiconsIcon icon={Settings01Icon} size={13} />
          Advanced settings
          <span className={`transition-transform ${showAdvanced ? 'rotate-90' : ''}`}><HugeiconsIcon icon={ArrowRight01Icon} size={10} /></span>
        </button>
        {showAdvanced && (
          <div className="mt-3 space-y-3">
            <div>
              <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5 uppercase tracking-wider">
                Dockerfile path <span className="text-[var(--text-dim)] normal-case font-normal">(overrides auto-detect)</span>
              </label>
              <Input value={dockerfilePath} onChange={e => onDockerfileChange(e.target.value)} placeholder="./Dockerfile"
                className="bg-[var(--surface-2)] border border-[var(--rail)] text-[var(--text)]" />
            </div>
            {sourceType === 'git' && !selectedRepo && (
              <div>
                <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5 uppercase tracking-wider">
                  Credentials <span className="text-[var(--text-dim)] normal-case font-normal">(for private repos)</span>
                </label>
                <Input value={credentials} onChange={e => onCredentialsChange(e.target.value)} placeholder="Deploy key or user:token"
                  className="bg-[var(--surface-2)] border border-[var(--rail)] text-[var(--text)]" />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Build preview */}
      <BuildPreview sourceType={sourceType} gitUrl={gitUrl} branch={branch} repoName={repoName}
        dockerfilePath={dockerfilePath} envCount={Object.keys(parsedEnvVars).length}
        frameworkLabel={buildPlan?.frameworkLabel} frameworkVersion={buildPlan?.frameworkVersion}
        buildCommand={buildPlan?.buildCommand} outputDirectory={buildPlan?.outputDirectory}
        port={buildPlan?.port} runtime={buildPlan?.runtime} monorepo={buildPlan?.monorepo} />
    </Card>
  );
}

// Framework detection sub-section
interface FrameworkDetectionProps {
  sourceType: SourceType;
  buildPlan: BuildPlan | null;
  detecting: boolean;
  detectError: string | null;
  onRunDetection: () => void;
}

function FrameworkDetection({ sourceType, buildPlan, detecting, detectError, onRunDetection }: FrameworkDetectionProps) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <HugeiconsIcon icon={Rocket01Icon} size={16} className="text-[var(--success)]" />
        <h2 className="text-sm font-semibold text-[var(--text)]">Framework detection</h2>
      </div>

      {detecting && (
        <div className="rounded-lg border border-[var(--rail)] bg-[var(--surface-2)] p-4 flex items-center gap-3">
          <div className="animate-spin w-4 h-4 border-2 border-[var(--text-dim)] border-t-transparent rounded-full" />
          <div><p className="text-sm text-[var(--text-muted)]">Detecting framework…</p><p className="text-xs text-[var(--text-dim)]">Cloning repository and analyzing files</p></div>
        </div>
      )}

      {!detecting && buildPlan && (
        <div className="rounded-lg border border-[var(--success)]/30 bg-[var(--success)]/5 p-4">
          <div className="flex items-center gap-2 mb-3">
            <HugeiconsIcon icon={CheckmarkCircle02Icon} size={16} className="text-[var(--success)]" />
            <span className="text-sm font-semibold text-[var(--text)]">{buildPlan.frameworkLabel}{buildPlan.frameworkVersion ? ` ${buildPlan.frameworkVersion}` : ''}</span>
            {buildPlan.monorepo && <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--accent)]/10 text-[var(--accent)] font-mono">{buildPlan.monorepo} monorepo</span>}
          </div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
            {[['Build', buildPlan.buildCommand], ['Output', buildPlan.outputDirectory], ['Port', String(buildPlan.port)], ['Runtime', buildPlan.runtime]].map(([label, value]) => (
              <div key={label}><span className="text-[var(--text-dim)]">{label}</span><p className="text-[var(--text-muted)] font-mono mt-0.5">{value}</p></div>
            ))}
          </div>
        </div>
      )}

      {!detecting && detectError && !buildPlan && (
        <div className="rounded-lg border border-[var(--warning)]/30 bg-[var(--warning)]/5 p-4 flex items-start justify-between gap-3">
          <div><p className="text-sm text-[var(--text-muted)]">Could not auto-detect framework</p><p className="text-xs text-[var(--text-dim)] mt-0.5">{detectError}</p></div>
          <button onClick={onRunDetection} className="text-xs text-[var(--accent)] hover:text-[var(--accent)] flex-shrink-0">Retry</button>
        </div>
      )}

      {!detecting && !buildPlan && !detectError && (
        <div className="rounded-lg border border-[var(--rail)] bg-[var(--surface-2)] p-4 flex items-center justify-between gap-3">
          <p className="text-xs text-[var(--text-muted)]">
            {sourceType === 'git' ? 'Ready to detect your framework.' : 'We\'ll detect your framework when building the archive.'}
          </p>
          {sourceType === 'git' && <button onClick={onRunDetection} className="text-xs text-[var(--accent)] hover:text-[var(--accent)]">Detect now</button>}
        </div>
      )}
    </div>
  );
}
