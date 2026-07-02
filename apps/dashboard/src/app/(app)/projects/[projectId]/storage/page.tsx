'use client';

import { useParams } from 'next/navigation';
import { StorageList } from '@/components/storage/storage-list';

export default function ProjectStoragePage() {
  const { projectId } = useParams<{ projectId: string }>();
  return <StorageList projectId={projectId} />;
}
