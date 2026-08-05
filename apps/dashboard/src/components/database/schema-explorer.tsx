'use client';

import { useState } from 'react';
import { useDatabase } from '@/app/(app)/projects/[projectId]/databases/database-context';
import { SchemaTree } from './schema-tree';
import { SchemaDetail } from './schema-detail';
import { useSchemaExplorer } from './schema-explorer-hooks';

export function SchemaExplorer() {
  const { schema, selectedTable, selectTable, rowsByTable, fetchRows, loadingSchema, realtimeTables, columnsCache } = useDatabase();
  const [schemaName, setSchemaName] = useState('public');

  useSchemaExplorer(selectedTable);

  const rowState = selectedTable ? rowsByTable[selectedTable] : null;

  return (
    <div className="flex h-full min-h-0">
      <SchemaTree
        schema={schema}
        schemaName={schemaName}
        selectedTable={selectedTable}
        loadingSchema={loadingSchema}
        realtimeTables={realtimeTables}
        onSchemaSelect={setSchemaName}
        onTableSelect={selectTable}
        onTableFetch={fetchRows}
      />
      <SchemaDetail
        table={selectedTable}
        schema={schema}
        realtimeTables={realtimeTables}
        rowState={rowState ?? null}
        columnsCache={columnsCache}
        onRefresh={fetchRows}
      />
    </div>
  );
}
