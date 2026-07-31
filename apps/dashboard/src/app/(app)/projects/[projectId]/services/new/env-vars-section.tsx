// Env vars section for step-configure

import Link from 'next/link';
import { HugeiconsIcon } from '@hugeicons/react';
import { CheckmarkCircle02Icon } from '@hugeicons/core-free-icons';

interface EnvVarsSectionProps {
  value: string;
  onChange: (v: string) => void;
  parsedCount: number;
  projectSlug: string;
}

export function EnvVarsSection({ value, onChange, parsedCount, projectSlug }: EnvVarsSectionProps) {
  return (
    <div>
      <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5 uppercase tracking-wider">
        Environment variables <span className="text-[var(--text-dim)] normal-case font-normal">(optional)</span>
      </label>
      <p className="text-xs text-[var(--text-muted)] mb-2">
        Paste your <code className="text-[var(--text-dim)]">.env</code> file or add <code className="text-[var(--text-dim)]">KEY=value</code> pairs, one per line.
      </p>
      <textarea
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={'DATABASE_URL=postgres://...\nAPI_SECRET=your-secret-here\n# Comments are ignored\nNEXT_PUBLIC_API_URL=https://...'}
        rows={6}
        className="w-full rounded-md bg-[var(--surface-2)] border border-[var(--rail)] text-[var(--text)] text-xs font-mono px-3 py-2.5 resize-y focus:outline-none focus:border-[var(--danger)]/40 placeholder:text-[var(--text-dim)]"
        spellCheck={false}
      />
      {parsedCount > 0 && (
        <div className="mt-2 flex items-center gap-1.5 text-xs text-[var(--success)]">
          <HugeiconsIcon icon={CheckmarkCircle02Icon} size={12} />
          {parsedCount} variable{parsedCount === 1 ? '' : 's'} ready
        </div>
      )}
      <p className="text-[10px] text-[var(--text-dim)] mt-1.5">
        Also configurable in <Link href={`/projects/${projectSlug}/settings`} className="text-[var(--accent)] hover:underline">project settings</Link>.
      </p>
    </div>
  );
}
