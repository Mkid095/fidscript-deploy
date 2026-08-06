// SubdomainSelection — pick a subdomain for the deployment.
//
// The deployment will be reachable at:
//   {subdomain}.apps.{platformDomain}
//
// "Default" uses the project's slug, which the platform assigns automatically.
// A custom subdomain must be DNS-valid (lowercase letters, digits, hyphens,
// 1-63 chars) and is unique per platform zone.

import { useState, useEffect } from 'react';
import { Input } from '@fidscript/ui';
import { HugeiconsIcon } from '@hugeicons/react';
import { Globe02Icon, LinkSquare02Icon } from '@hugeicons/core-free-icons';

interface SubdomainSelectionProps {
  projectSlug: string;
  platformDomain: string;
  value: string;
  onChange: (v: string) => void;
  availableDomains: Array<{ id: string; domain: string }>;
  onAssignExisting: (domainId: string) => void;
}

function validateSubdomain(s: string): string | null {
  if (!s) return null;
  if (s.length > 63) return 'Maximum 63 characters';
  if (!/^[a-z0-9-]+$/.test(s)) return 'Only lowercase letters, digits and hyphens';
  if (s.startsWith('-') || s.endsWith('-')) return 'Cannot start or end with a hyphen';
  return null;
}

export function SubdomainSelection({
  projectSlug,
  platformDomain,
  value,
  onChange,
  availableDomains,
  onAssignExisting,
}: SubdomainSelectionProps) {
  const [mode, setMode] = useState<'default' | 'custom' | 'existing'>('default');
  const [custom, setCustom] = useState('');

  useEffect(() => {
    if (mode === 'default') {
      onChange('');
    } else if (mode === 'custom') {
      onChange(custom);
    } else {
      onChange('');
    }
  }, [mode, custom, onChange]);

  const validationError = mode === 'custom' ? validateSubdomain(custom) : null;
  const previewUrl =
    mode === 'custom' && custom && !validationError
      ? `https://${custom}.apps.${platformDomain}`
      : `https://${projectSlug}.apps.${platformDomain}`;

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <HugeiconsIcon icon={Globe02Icon} size={16} className="text-[var(--accent)]" />
        <h2 className="text-sm font-semibold text-[var(--text)]">Subdomain</h2>
      </div>

      <div className="space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <button
            type="button"
            onClick={() => setMode('default')}
            className={`text-left p-3 rounded-lg border transition-colors ${mode === 'default' ? 'border-[var(--accent)] bg-[var(--accent)]/5' : 'border-[var(--rail)] hover:border-[var(--text-dim)]'}`}
          >
            <p className="text-xs font-semibold text-[var(--text)]">Default</p>
            <p className="text-[10px] text-[var(--text-muted)] mt-0.5 truncate">{projectSlug}.apps.{platformDomain}</p>
          </button>
          <button
            type="button"
            onClick={() => setMode('custom')}
            className={`text-left p-3 rounded-lg border transition-colors ${mode === 'custom' ? 'border-[var(--accent)] bg-[var(--accent)]/5' : 'border-[var(--rail)] hover:border-[var(--text-dim)]'}`}
          >
            <p className="text-xs font-semibold text-[var(--text)]">Custom</p>
            <p className="text-[10px] text-[var(--text-muted)] mt-0.5">Pick your own subdomain</p>
          </button>
          <button
            type="button"
            disabled={availableDomains.length === 0}
            onClick={() => setMode('existing')}
            className={`text-left p-3 rounded-lg border transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${mode === 'existing' ? 'border-[var(--accent)] bg-[var(--accent)]/5' : 'border-[var(--rail)] hover:border-[var(--text-dim)]'}`}
          >
            <p className="text-xs font-semibold text-[var(--text)]">Existing</p>
            <p className="text-[10px] text-[var(--text-muted)] mt-0.5">
              {availableDomains.length === 0 ? 'No custom domains yet' : `Use ${availableDomains.length} custom`}
            </p>
          </button>
        </div>

        {mode === 'custom' && (
          <div>
            <Input
              value={custom}
              onChange={e => setCustom(e.target.value.toLowerCase())}
              placeholder="my-app"
              className="bg-[var(--surface-2)] border border-[var(--rail)] text-[var(--text)] font-mono"
            />
            {validationError && (
              <p className="text-[10px] text-[var(--danger)] mt-1">{validationError}</p>
            )}
          </div>
        )}

        {mode === 'existing' && availableDomains.length > 0 && (
          <div className="space-y-1.5 max-h-40 overflow-y-auto">
            {availableDomains.map(d => (
              <button
                key={d.id}
                type="button"
                onClick={() => onAssignExisting(d.id)}
                className="w-full text-left px-3 py-2 rounded-md border border-[var(--rail)] hover:border-[var(--text-dim)] bg-[var(--surface-2)] flex items-center justify-between"
              >
                <span className="text-xs font-mono text-[var(--text)] truncate">{d.domain}</span>
                <HugeiconsIcon icon={LinkSquare02Icon} size={12} className="text-[var(--text-dim)] flex-shrink-0" />
              </button>
            ))}
          </div>
        )}

        <div className="rounded-md bg-[var(--surface-2)] border border-[var(--rail)] px-3 py-2 flex items-center gap-2">
          <HugeiconsIcon icon={LinkSquare02Icon} size={12} className="text-[var(--text-dim)]" />
          <span className="text-[11px] font-mono text-[var(--text-muted)] truncate">{previewUrl}</span>
        </div>
      </div>
    </div>
  );
}
