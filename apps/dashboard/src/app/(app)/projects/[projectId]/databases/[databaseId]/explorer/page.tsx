'use client';

import { SchemaExplorer } from '@/components/database/schema-explorer';

export default function ExplorerPage() {
  return (
    <div className="flex flex-col h-full min-h-0">
      <SchemaExplorer />
    </div>
  );
}
