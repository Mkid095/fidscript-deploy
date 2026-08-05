'use client';

interface DiffViewProps {
  left: string;
  right: string;
  leftLabel: string | null;
  rightLabel: string | null;
}

// Simple side-by-side diff view — highlights lines that changed between two
// versions of the same function. Sufficient for short snippets; a true
// LCS-based diff would be heavier than the page needs.
export function DiffView({ left, right, leftLabel, rightLabel }: DiffViewProps) {
  const leftLines = left.split('\n');
  const rightLines = right.split('\n');
  const maxLines = Math.max(leftLines.length, rightLines.length);

  return (
    <div className="grid grid-cols-2 gap-2 text-xs font-mono overflow-auto max-h-80 rounded border border-[var(--rail)]">
      <div className="overflow-auto">
        <div className="px-2 py-1 bg-[var(--surface-2)] border-b border-[var(--rail)] sticky top-0 text-[var(--text-muted)]">
          v{leftLabel}
        </div>
        {Array.from({ length: maxLines }, (_, i) => {
          const l = leftLines[i];
          const r = rightLines[i];
          const changed = l !== r;
          return (
            <div key={i} className={`px-2 py-0.5 ${changed ? 'bg-rose-500/10 text-rose-400' : 'text-[var(--text-muted)]'}`}>
              {l ?? ''}
            </div>
          );
        })}
      </div>
      <div className="overflow-auto">
        <div className="px-2 py-1 bg-[var(--surface-2)] border-b border-[var(--rail)] sticky top-0 text-[var(--text-muted)]">
          v{rightLabel}
        </div>
        {Array.from({ length: maxLines }, (_, i) => {
          const l = leftLines[i];
          const r = rightLines[i];
          const changed = l !== r;
          return (
            <div key={i} className={`px-2 py-0.5 ${changed ? 'bg-emerald-500/10 text-emerald-400' : 'text-[var(--text-muted)]'}`}>
              {r ?? ''}
            </div>
          );
        })}
      </div>
    </div>
  );
}