'use client';

import { RealtimeMonitor } from '@/components/database/realtime-monitor';

export default function RealtimePage() {
  return (
    <div className="flex flex-col h-full min-h-0">
      <RealtimeMonitor />
    </div>
  );
}
