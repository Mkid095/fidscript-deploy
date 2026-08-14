import { useMemo } from 'react';

interface DataGridBodyProps {
  columns: string[];
  primaryKey: string;
  data: Record<string, unknown>[];
  selectedIds: Set<unknown>;
  onToggleSelect: (id: unknown) => void;
  onEdit: (row: Record<string, unknown>) => void;
}

function CellContent({ value }: { value: unknown }) {
  return useMemo(() => {
    if (value === null) return <span className="text-[var(--text-dim)] italic">NULL</span>;
    if (typeof value === 'object') return <span className="font-mono text-[var(--text-muted)]">{JSON.stringify(value)}</span>;
    return String(value);
  }, [value]);
}

export function DataGridBody({
  columns, primaryKey, data, selectedIds, onToggleSelect, onEdit,
}: DataGridBodyProps) {
  return (
    <tbody>
      {data.map((row, i) => (
        <tr
          key={i}
          className={`border-b border-[var(--rail)]/40 hover:bg-[var(--rail)]/20 ${selectedIds.has(row[primaryKey]) ? 'bg-rose-500/5' : ''}`}
        >
          <td className="px-2 py-1.5">
            <input
              type="checkbox"
              className="accent-[var(--accent)]"
              checked={selectedIds.has(row[primaryKey])}
              onChange={() => onToggleSelect(row[primaryKey])}
            />
          </td>
          {columns.map(c => (
            <td
              key={c}
              className="px-3 py-1.5 font-mono text-[var(--text-muted)] max-w-48 truncate"
              title={String(row[c] ?? 'NULL')}
            >
              <CellContent value={row[c]} />
            </td>
          ))}
          <td className="px-3 py-1.5">
            <button
              onClick={() => onEdit(row)}
              className="text-[10px] text-[var(--text-dim)] hover:text-[var(--accent)]"
            >
              Edit
            </button>
          </td>
        </tr>
      ))}
    </tbody>
  );
}
