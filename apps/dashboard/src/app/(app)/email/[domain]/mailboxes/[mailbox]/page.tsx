'use client';

import { useParams } from 'next/navigation';
import { RedirectToProject } from '@/components/navigation/redirect-to-project';

/**
 * A mailbox — moved into the project console.
 */
export default function Page() {
  const params = useParams();
  const domainId = params.domain as string;
  const mailboxId = params.mailbox as string;
  return (
    <RedirectToProject section={`email/domains/${domainId}/mailboxes/${mailboxId}`} />
  );
}
