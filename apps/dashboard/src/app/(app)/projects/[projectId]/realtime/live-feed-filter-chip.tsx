// FilterChip — shared filter pill for the live feed panel

interface FilterChipProps {
  active: boolean;
  onClick: () => void;
  label: string;
  accent?: string;
}

export function FilterChip({ active, onClick, label, accent }: FilterChipProps) {
  return (
    <button
      onClick={onClick}
      className={`
        text-[11px] whitespace-nowrap px-2.5 py-1 rounded-full border transition-colors
        ${active
          ? (accent ?? 'bg-[var(--accent)]/15 border-[var(--accent)]/40 text-[var(--accent)]')
          : 'border-[var(--rail-light)] text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--rail)]'
        }
      `}
    >
      {label}
    </button>
  );
}
