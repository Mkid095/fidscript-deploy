'use client';

import { useParams } from 'next/navigation';
import { BucketDetail } from '@/components/storage/bucket-detail';

export default function BucketDetailPage() {
  const { projectId, bucket: bucketId } = useParams<{ projectId: string; bucket: string }>();
  return <BucketDetail projectId={projectId} bucketId={bucketId} />;
}
