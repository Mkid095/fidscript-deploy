'use client';

import { HugeiconsIcon } from '@hugeicons/react';
import { GithubIcon, HardDriveIcon, Link01Icon } from '@hugeicons/core-free-icons';

import type { ImportSource } from './new-deployment-types';

const SOURCES: { key: ImportSource; label: string; hint: string; Icon: typeof GithubIcon }[] = [
  { key: 'github', label: 'Connect GitHub', hint: 'Browse your repositories and branches', Icon: GithubIcon },
  { key: 'git', label: 'Import a git repository', hint: 'Any git URL — a host you control', Icon: Link01Icon },
  { key: 'archive', label: 'Upload the code', hint: 'A .zip or .tar.gz of your project', Icon: HardDriveIcon },
];

/**
 * The three ways to bring code in.
 *
 * GitHub is what the platform recommends: a connected account means the
 * platform can follow the repository, redeploy on a push and roll back. The
 * other two are there because the code does not always live on GitHub.
 */
export function SourceCards({
  source,
  onSourceChange,
}: {
  source: ImportSource;
  onSourceChange: (source: ImportSource) => void;
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      {SOURCES.map(({ key, label, hint, Icon }) => (
        <button
          key={key}
          type="button"
          onClick={() => onSourceChange(key)}
          className={`flex items-start gap-3 p-4 rounded-lg border text-left transition-all ${
            source === key
              ? 'border-[var(--accent)]/60 bg-[var(--accent)]/5'
              : 'border-[var(--rail)] bg-[var(--surface-2)] hover:border-[var(--rail-light)]'
          }`}
        >
          <HugeiconsIcon
            icon={Icon}
            size={18}
            className={`mt-0.5 flex-shrink-0 ${source === key ? 'text-[var(--accent)]' : 'text-[var(--text-dim)]'}`}
          />
          <span>
            <span className={`block text-sm font-medium ${source === key ? 'text-[var(--text)]' : 'text-[var(--text-muted)]'}`}>
              {label}
            </span>
            <span className="block text-xs text-[var(--text-dim)] mt-0.5">{hint}</span>
          </span>
        </button>
      ))}
    </div>
  );
}
