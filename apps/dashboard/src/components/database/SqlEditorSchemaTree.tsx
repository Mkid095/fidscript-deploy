'use client';

import { HugeiconsIcon } from '@hugeicons/react';
import { Database02Icon, ChevronDownIcon, ChevronRightIcon } from '@hugeicons/core-free-icons';

interface SchemaTable {
  schema: string;
  name: string;
  rowCount?: number;
}

interface SqlEditorSchemaTreeProps {
  bySchema: Record<string, SchemaTable[]>;
  expandedSchemas: Set<string>;
  toggleSchema: (s: string) => void;
  insertTableSQL: (tableName: string) => void;
}

export function SqlEditorSchemaTree({ bySchema, expandedSchemas, toggleSchema, insertTableSQL }: SqlEditorSchemaTreeProps) {
  return (
    <>
      {Object.entries(bySchema).map(([sname, tbls]) => (
        <div key={sname} className="mb-1">
          <button
            onClick={() => toggleSchema(sname)}
            className="w-full flex items-center gap-1 px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--text-dim)] hover:text-[var(--text)]"
          >
            <HugeiconsIcon icon={expandedSchemas.has(sname) ? ChevronDownIcon : ChevronRightIcon} size={10} />
            {sname}
            <span className="ml-auto opacity-60 font-normal">({tbls.length})</span>
          </button>
          {expandedSchemas.has(sname) && (
            <div className="ml-2 space-y-0.5 pb-1">
              {tbls.map(t => (
                <button
                  key={`${t.schema}.${t.name}`}
                  onClick={() => insertTableSQL(t.name)}
                  className="w-full flex items-center gap-1.5 px-2 py-1 rounded text-[11px] text-[var(--text-dim)] hover:text-[var(--text)] hover:bg-[var(--rail)]/30 text-left"
                >
                  <HugeiconsIcon icon={Database02Icon} size={11} className="flex-shrink-0 text-[var(--text-dim)]" />
                  <span className="truncate">{t.name}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      ))}
    </>
  );
}
