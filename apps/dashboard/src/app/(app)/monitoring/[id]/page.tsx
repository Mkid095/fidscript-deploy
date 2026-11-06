'use client';

import { useParams } from 'next/navigation';
import { RedirectToProject } from '@/components/navigation/redirect-to-project';

/**
 * A monitoring rule — moved into the project console.
 */
export default function Page() {
  const params = useParams();
  const id = params.id as string;
  return <RedirectToProject section="monitoring" id={id} />;
}
