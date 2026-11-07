'use client';

import { useParams } from 'next/navigation';
import { RedirectToProject } from '@/components/navigation/redirect-to-project';

/**
 * A domain — moved into the project console.
 */
export default function Page() {
  const params = useParams();
  const domainId = params.domain as string;
  return <RedirectToProject section="email/domains" id={domainId} />;
}
