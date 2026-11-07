'use client';

import { RedirectToProject } from '@/components/navigation/redirect-to-project';

/**
 * Analytics — moved into the project console.
 *
 * This was the email console's own screen, reached without a project in
 * the address. The project console is the one way, so this route sends the
 * caller there.
 */
export default function Page() {
  return <RedirectToProject section="email/analytics" />;
}
