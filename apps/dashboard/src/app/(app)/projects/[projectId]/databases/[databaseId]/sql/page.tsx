'use client';

import { SqlEditorV2 } from '@/components/database/sql-editor-v2';

export default function SqlPage() {
  return (
    <div className="flex flex-col h-full min-h-0 overflow-hidden">
      <SqlEditorV2 />
    </div>
  );
}
