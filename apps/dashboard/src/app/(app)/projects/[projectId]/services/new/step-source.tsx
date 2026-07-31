// Step 0: Source type selection

import { Card } from '@fidscript/ui';
import { HugeiconsIcon } from '@hugeicons/react';
import { GithubIcon, HardDriveIcon } from '@hugeicons/core-free-icons';

import type { SourceType } from './new-deploy-utils';

interface StepSourceProps {
  sourceType: SourceType;
  onChange: (s: SourceType) => void;
}

export function StepSource({ sourceType, onChange }: StepSourceProps) {
  return (
    <Card className="border border-[var(--rail)] p-5">
      <h2 className="text-sm font-semibold text-[var(--text)] mb-1">Choose a source</h2>
      <p className="text-xs text-[var(--text-muted)] mb-4">How do you want to provide your code?</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {([
          { key: 'git', label: 'Git repository', desc: 'Clone from GitHub or any git URL', icon: GithubIcon },
          { key: 'archive', label: 'Archive upload', desc: 'Upload a .zip or .tar.gz', icon: HardDriveIcon },
        ] as const).map(s => (
          <button
            key={s.key}
            type="button"
            onClick={() => onChange(s.key)}
            className={`flex items-start gap-3 p-4 rounded-lg border text-left transition-all ${
              sourceType === s.key
                ? 'border-[var(--danger)]/60 bg-[var(--danger)]/5'
                : 'border-[var(--rail)] bg-[var(--surface-2)] hover:border-[var(--rail-light)]'
            }`}
          >
            <HugeiconsIcon icon={s.icon} size={20} className={sourceType === s.key ? 'text-[var(--danger)] mt-0.5' : 'text-[var(--text-dim)] mt-0.5'} />
            <div>
              <p className={`text-sm font-medium ${sourceType === s.key ? 'text-[var(--text)]' : 'text-[var(--text-muted)]'}`}>{s.label}</p>
              <p className="text-xs text-[var(--text-dim)] mt-0.5">{s.desc}</p>
            </div>
          </button>
        ))}
      </div>
    </Card>
  );
}
