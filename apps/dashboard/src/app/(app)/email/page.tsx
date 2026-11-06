'use client';

import { RedirectToProject } from '@/components/navigation/redirect-to-project';

/**
 * Email — moved into the project console.
 *
 * This was a second way of asking for the same screen: a project's email
 * without a project in the address. The project console is the one way, so
 * this route sends the caller there.
 */
export default function Page() {
  return <RedirectToProject section="email" />;
}
