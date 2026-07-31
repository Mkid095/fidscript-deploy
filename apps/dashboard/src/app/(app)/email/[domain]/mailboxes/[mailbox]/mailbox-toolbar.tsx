'use client';

import { HugeiconsIcon } from '@hugeicons/react';
import { Search01Icon, Mail01Icon, Refresh01Icon } from '@hugeicons/core-free-icons';
import { Button, Input } from '@fidscript/ui';

type Folder = 'inbox' | 'sent' | 'trash';

interface MailboxToolbarProps {
  folder: Folder;
  search: string;
  onFolderChange: (f: Folder) => void;
  onSearchChange: (s: string) => void;
  onRefresh: () => void;
  onCompose: () => void;
}

export function MailboxToolbar({ folder, search, onFolderChange, onSearchChange, onRefresh, onCompose }: MailboxToolbarProps) {
  return (
    <>
      {/* Toolbar */}
      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1">
          <HugeiconsIcon icon={Search01Icon} size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-dim)]" />
          <Input
            value={search}
            onChange={e => onSearchChange(e.target.value)}
            placeholder="Search subject, from, to…"
            className="pl-9 bg-[var(--surface-2)] border border-[var(--rail)] text-[var(--text)] placeholder:text-[var(--text-dim)]"
          />
        </div>
        <Button variant="ghost" size="sm" onClick={onRefresh} title="Refresh">
          <HugeiconsIcon icon={Refresh01Icon} size={14} />
        </Button>
        <Button variant="primary" size="sm" onClick={onCompose} className="flex items-center gap-1.5">
          <HugeiconsIcon icon={Mail01Icon} size={14} />
          Compose
        </Button>
      </div>

      {/* Folder tabs */}
      <div className="flex items-center gap-1 mb-4 border-b border-[var(--rail)]">
        {(['inbox', 'sent', 'trash'] as Folder[]).map(f => (
          <button
            key={f}
            type="button"
            onClick={() => onFolderChange(f)}
            className={`px-4 py-2 text-xs uppercase tracking-wider transition-colors border-b-2 capitalize ${
              folder === f
                ? 'border-[var(--warning)] text-[var(--text)]'
                : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-muted)]'
            }`}
          >
            {f}
          </button>
        ))}
      </div>
    </>
  );
}
