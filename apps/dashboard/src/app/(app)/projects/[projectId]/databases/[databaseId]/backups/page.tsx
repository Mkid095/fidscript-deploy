'use client';

import { BackupsPanel } from '@/components/database/backups-panel';

export default function BackupsPage() {
  return (
    <div className="h-full overflow-y-auto">
      <BackupsPanel />
    </div>
  );
}
