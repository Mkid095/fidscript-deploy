'use client';

import { RedirectToProject } from '@/components/navigation/redirect-to-project';

/**
 * Databases — moved into the project console.
 *
 * This was a second implementation of the same screen: the project's
 * databases without a project in the address. The project console is the one
 * way, so this route sends the caller there.
 */
export default function Page() {
  return <RedirectToProject section="databases" />;
}
