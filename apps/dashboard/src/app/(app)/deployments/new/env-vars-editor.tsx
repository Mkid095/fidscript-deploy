'use client';

import { Button } from '@fidscript/ui';
import { HugeiconsIcon } from '@hugeicons/react';
import { Add01Icon, Delete02Icon } from '@hugeicons/core-free-icons';

import type { EnvVarEntry } from './new-deployment-types';

interface EnvVarsEditorProps {
  envVars: EnvVarEntry[];
  onAdd: () => void;
  onUpdate: (index: number, patch: Partial<EnvVarEntry>) => void;
  onRemove: (index: number) => void;
  onPasteEnv: (text: string) => void;
}

/**
 * The environment variables of the deployment.
 *
 * Each row has a "required" mark. A required variable stops the build when
 * it is missing, so the operator finds out before the build starts rather
 * than from a log three hundred lines in.
 */
export function EnvVarsEditor({ envVars, onAdd, onUpdate, onRemove, onPasteEnv }: EnvVarsEditorProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
            Environment variables
          </p>
          <p className="text-xs text-[var(--text-dim)] mt-0.5">
            Saved on the project before the build starts.
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={onAdd} className="flex items-center gap-1.5">
          <HugeiconsIcon icon={Add01Icon} size={13} />
          Add
        </Button>
      </div>

      {envVars.length === 0 && (
        <p className="text-xs text-[var(--text-muted)]">
          None yet. A variable the application needs can be added here, and marked required.
        </p>
      )}

      <div className="space-y-2">
        {envVars.map((entry, index) => (
          <div key={index} className="flex items-center gap-2">
            <input
              value={entry.key}
              onChange={e => onUpdate(index, { key: e.target.value })}
              placeholder="KEY"
              className="w-40 shrink-0 bg-[var(--surface-2)] border border-[var(--rail)] text-[var(--text)] rounded px-2.5 py-1.5 text-xs font-mono focus:outline-none focus:border-[var(--accent)] placeholder:text-[var(--text-dim)]"
            />
            <input
              value={entry.value}
              onChange={e => onUpdate(index, { value: e.target.value })}
              placeholder="value"
              className="flex-1 min-w-0 bg-[var(--surface-2)] border border-[var(--rail)] text-[var(--text)] rounded px-2.5 py-1.5 text-xs font-mono focus:outline-none focus:border-[var(--accent)] placeholder:text-[var(--text-dim)]"
            />
            <button
              type="button"
              onClick={() => onUpdate(index, { required: !entry.required })}
              aria-pressed={entry.required}
              title={entry.required ? 'Required — the build stops without it' : 'Optional'}
              className={`shrink-0 px-2 py-1.5 rounded text-[10px] font-medium uppercase tracking-wider border transition-colors ${
                entry.required
                  ? 'border-[var(--warning)]/50 bg-[var(--warning)]/10 text-[var(--warning)]'
                  : 'border-[var(--rail)] text-[var(--text-dim)] hover:text-[var(--text-muted)]'
              }`}
            >
              {entry.required ? 'Required' : 'Optional'}
            </button>
            <button
              type="button"
              onClick={() => onRemove(index)}
              aria-label={`Remove ${entry.key || 'variable'}`}
              className="shrink-0 p-1.5 text-[var(--text-dim)] hover:text-[var(--danger)] transition-colors"
            >
              <HugeiconsIcon icon={Delete02Icon} size={14} />
            </button>
          </div>
        ))}
      </div>

      <details className="group">
        <summary className="cursor-pointer text-xs text-[var(--accent)] hover:underline select-none">
          Paste a .env file
        </summary>
        <textarea
          onChange={e => onPasteEnv(e.target.value)}
          rows={5}
          spellCheck={false}
          placeholder={'DATABASE_URL=postgres://...\nAPI_SECRET=your-secret-here\n# Comments are ignored'}
          className="mt-2 w-full rounded-md bg-[var(--surface-2)] border border-[var(--rail)] text-[var(--text)] text-xs font-mono px-3 py-2.5 resize-y focus:outline-none focus:border-[var(--accent)] placeholder:text-[var(--text-dim)]"
        />
      </details>
    </div>
  );
}
