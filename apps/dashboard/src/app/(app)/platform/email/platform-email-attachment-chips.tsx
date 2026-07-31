'use client';

import { HugeiconsIcon } from '@hugeicons/react';
import { Attachment01Icon } from '@hugeicons/core-free-icons';

function formatBytes(bytes: number): string {
  if (bytes < 1_024) return `${bytes} B`;
  if (bytes < 1_048_576) return `${(bytes / 1_024).toFixed(1)} KB`;
  return `${(bytes / 1_048_576).toFixed(1)} MB`;
}

interface Props {
  files: File[];
  onRemove: (index: number) => void;
}

export function AttachmentChips({ files, onRemove }: Props) {
  if (files.length === 0) return null;
  return (
    <div className="mt-2 space-y-1">
      {files.map((file, i) => (
        <div key={i} className="flex items-center gap-2 text-xs text-[var(--text-muted)] bg-[var(--surface-2)] border border-[var(--rail)] rounded px-2 py-1.5">
          <HugeiconsIcon icon={Attachment01Icon} size={14} strokeWidth={1.5} />
          <span className="flex-1 truncate">{file.name}</span>
          <span>({formatBytes(file.size)})</span>
          <button
            type="button"
            onClick={() => onRemove(i)}
            className="text-[var(--text-muted)] hover:text-[var(--danger)] transition-colors"
          >
            x
          </button>
        </div>
      ))}
    </div>
  );
}
