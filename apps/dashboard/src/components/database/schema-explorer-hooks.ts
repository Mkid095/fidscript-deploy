// Business logic hooks for SchemaExplorer — column fetching.

import { useEffect } from 'react';
import { useDatabase } from '@/app/(app)/projects/[projectId]/databases/database-context';

/** Loads column metadata whenever the selected table changes. */
export function useSchemaExplorer(selectedTable: string | null) {
  const { fetchColumns } = useDatabase();

  useEffect(() => {
    if (selectedTable) {
      fetchColumns(selectedTable);
    }
  }, [selectedTable, fetchColumns]);
}
