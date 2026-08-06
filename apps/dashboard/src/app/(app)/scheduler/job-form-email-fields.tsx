'use client';

import { Input } from '@fidscript/ui';

interface EmailActionFieldsProps {
  from: string;
  onFromChange: (v: string) => void;
  to: string;
  onToChange: (v: string) => void;
  subject: string;
  onSubjectChange: (v: string) => void;
  body: string;
  onBodyChange: (v: string) => void;
}

export function EmailActionFields({
  from, onFromChange,
  to, onToChange,
  subject, onSubjectChange,
  body, onBodyChange,
}: EmailActionFieldsProps) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-[var(--text-muted)] mb-1.5 font-medium">From (optional)</label>
          <Input value={from} onChange={e => onFromChange(e.target.value)}
            placeholder="alerts@example.com"
            className="bg-[var(--surface-2)] border border-[var(--rail)] text-[var(--text)] w-full text-sm" />
        </div>
        <div>
          <label className="block text-xs text-[var(--text-muted)] mb-1.5 font-medium">To</label>
          <Input value={to} onChange={e => onToChange(e.target.value)}
            placeholder="recipient@example.com"
            className="bg-[var(--surface-2)] border border-[var(--rail)] text-[var(--text)] w-full text-sm" />
        </div>
      </div>
      <div>
        <label className="block text-xs text-[var(--text-muted)] mb-1.5 font-medium">Subject</label>
        <Input value={subject} onChange={e => onSubjectChange(e.target.value)}
          placeholder="Scheduled report"
          className="bg-[var(--surface-2)] border border-[var(--rail)] text-[var(--text)] w-full text-sm" />
      </div>
      <div>
        <label className="block text-xs text-[var(--text-muted)] mb-1.5 font-medium">Body</label>
        <textarea value={body} onChange={e => onBodyChange(e.target.value)}
          placeholder="Hello,&#10;&#10;Here is your scheduled update…"
          rows={4}
          className="bg-[var(--surface-2)] border border-[var(--rail)] text-[var(--text)] w-full text-sm resize-none rounded-lg px-3 py-2 focus:outline-none focus:border-[var(--accent)]" />
      </div>
      <p className="text-[10px] text-[var(--text-dim)]">
        The mail uses the project&apos;s active sender domain. Recipients must be a single
        email address (use multiple jobs for fan-out).
      </p>
    </div>
  );
}