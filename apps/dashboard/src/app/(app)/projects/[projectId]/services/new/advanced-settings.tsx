// Advanced settings section for step-configure

import { Input } from '@fidscript/ui';
import { HugeiconsIcon } from '@hugeicons/react';
import { Settings01Icon, ArrowRight01Icon } from '@hugeicons/core-free-icons';

import type { SourceType } from './new-deploy-utils';

interface AdvancedSettingsProps {
  show: boolean;
  sourceType: SourceType;
  dockerfilePath: string;
  credentials: string;
  selectedRepo: { full_name: string } | null;
  onDockerfileChange: (v: string) => void;
  onCredentialsChange: (v: string) => void;
  onToggle: () => void;
}

export function AdvancedSettings({ show, sourceType, dockerfilePath, credentials, selectedRepo, onDockerfileChange, onCredentialsChange, onToggle }: AdvancedSettingsProps) {
  return (
    <div className="border-t border-[var(--rail)] pt-4">
      <button type="button" onClick={onToggle}
        className="flex items-center gap-1.5 text-xs text-[var(--text-muted)] hover:text-[var(--text-muted)] transition-colors">
        <HugeiconsIcon icon={Settings01Icon} size={13} />
        Advanced settings
        <span className={`transition-transform ${show ? 'rotate-90' : ''}`}>
          <HugeiconsIcon icon={ArrowRight01Icon} size={10} />
        </span>
      </button>
      {show && (
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
  );
}
