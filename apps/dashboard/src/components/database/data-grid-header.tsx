interface DataGridHeaderProps {
  columns: string[];
  primaryKey: string;
  allSelected: boolean;
  onSelectAll: (checked: boolean) => void;
}

export function DataGridHeader({
  columns, primaryKey, allSelected, onSelectAll,
}: DataGridHeaderProps) {
  return (
    <thead className="bg-[var(--surface)] sticky top-0 z-10">
      <tr className="border-b border-[var(--rail)]">
        <th className="w-8 px-2 py-2">
          <input
            type="checkbox"
            className="accent-[var(--accent)]"
            checked={allSelected}
            onChange={e => onSelectAll(e.target.checked)}
          />
        </th>
        {columns.map(c => (
          <th
            key={c}
            className="text-left px-3 py-2 font-mono font-semibold text-[var(--text-dim)] uppercase tracking-wider text-[10px]"
          >
            {c}
          </th>
        ))}
        <th className="w-16 px-3 py-2" />
      </tr>
    </thead>
  );
}
