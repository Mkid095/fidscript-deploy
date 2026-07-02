'use client';

import { useParams } from 'next/navigation';
import { QueueDetail } from '@/components/queues/queue-detail';

export default function QueueDetailPage() {
  const { projectId, queueId } = useParams<{ projectId: string; queueId: string }>();
  return <QueueDetail queueId={queueId} />;
}
