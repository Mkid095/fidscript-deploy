// BuildPreview sub-component for step-configure

import { HugeiconsIcon } from '@hugeicons/react';
import { CheckmarkCircle02Icon, File01Icon } from '@hugeicons/core-free-icons';

import type { SourceType } from './new-deploy-utils';

interface BuildPreviewProps {
  sourceType: SourceType;
  gitUrl: string;
  branch: string;
  repoName: string;
  dockerfilePath: string;
  envCount?: number;
  frameworkLabel?: string;
  frameworkVersion?: string;
  buildCommand?: string;
  outputDirectory?: string;
  port?: number;
  runtime?: string;
  monorepo?: string;
}

export function BuildPreview(props: BuildPreviewProps) {
  const imageName = props.sourceType === 'git'
    ? `fidscript/${props.repoName.replace('/', '-').toLowerCase()}`
    : `fidscript/archive-${Date.now().toString(36)}`;
  const tagSuffix = Date.now().toString(36);

  return (
    <div className="rounded-lg bg-[var(--surface-2)] border border-[var(--rail)] p-4 space-y-2.5">
      <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-2">What will build</p>
      <div className="flex items-start gap-2.5">
        <HugeiconsIcon icon={File01Icon} size={13} className="text-[var(--text-dim)] mt-0.5 flex-shrink-0" />
        <div className="min-w-0">
          <p className="text-xs font-mono text-[var(--text-muted)] truncate">
            {props.sourceType === 'git' ? props.repoName : props.dockerfilePath || 'archive'}
          </p>
          {props.sourceType === 'git' && <p className="text-xs text-[var(--text-dim)]">github.com/{props.repoName}</p>}
        </div>
      </div>
      {props.sourceType === 'git' && (
        <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
          <HugeiconsIcon icon={File01Icon} size={13} className="text-[var(--text-dim)]" />
          <span className="font-mono text-[var(--text-muted)]">{props.branch || 'main'}</span>
        </div>
      )}
      {props.frameworkLabel ? (
        <div className="flex items-center gap-2 text-xs text-[var(--success)]">
          <HugeiconsIcon icon={CheckmarkCircle02Icon} size={13} />
          <span className="font-mono">{props.frameworkLabel}{props.frameworkVersion ? ` ${props.frameworkVersion}` : ''}</span>
          {props.monorepo && <span className="text-[10px] text-[var(--accent)]">({props.monorepo})</span>}
        </div>
      ) : (
        <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
          <HugeiconsIcon icon={File01Icon} size={13} className="text-[var(--text-dim)]" />
          <span className="font-mono text-[var(--text-muted)]">{props.dockerfilePath ? `Dockerfile at ${props.dockerfilePath}` : 'Auto-detect'}</span>
        </div>
      )}
      {props.frameworkLabel && props.buildCommand && (
        <div className="text-xs text-[var(--text-dim)] pl-5 space-y-0.5">
          <p>Build: <span className="font-mono text-[var(--text-muted)]">{props.buildCommand}</span></p>
          {props.outputDirectory && <p>Output: <span className="font-mono text-[var(--text-muted)]">{props.outputDirectory}</span> · Port: <span className="font-mono text-[var(--text-muted)]">{props.port}</span></p>}
        </div>
      )}
      {props.envCount != null && props.envCount > 0 && (
        <div className="flex items-center gap-2 text-xs text-[var(--success)]">
          <HugeiconsIcon icon={CheckmarkCircle02Icon} size={13} />
          <span className="font-mono">{props.envCount} env variable{props.envCount === 1 ? '' : 's'}</span>
        </div>
      )}
      <div className="border-t border-[var(--rail)] pt-2 mt-1">
        <p className="text-xs text-[var(--text-dim)] mb-1">Resulting image tag</p>
        <code className="text-[10px] font-mono text-[var(--text-muted)] bg-[var(--rail)] px-2 py-1 rounded block truncate">
          {imageName}:{(props.branch || 'archive').replace(/\//g, '-')}-{tagSuffix}
        </code>
      </div>
    </div>
  );
}
