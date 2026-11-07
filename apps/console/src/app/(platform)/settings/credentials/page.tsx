import { redirect } from 'next/navigation';

import { getPlatformCredentials, sessionUser } from '@/lib/api/platform';
import { Card, SectionHeader } from '@/components/ui/card';
import { Page } from '@/components/ui/page';
import { SettingsNav } from '@/components/platform/settings-nav';
import { CredentialsPanel } from '@/components/platform/credentials-panel';

export const metadata = { title: 'Credentials' };

/**
 * The applications' credentials.
 *
 * One email, one password — as a **decision**, not a fact the operator
 * discovers by trying to sign in. This screen says what each application
 * answers with right now, checks a candidate password against every one of
 * them live, and applies the platform's identity where an application takes
 * it from the platform.
 */
export default async function CredentialsPage() {
  const user = await sessionUser();
  if (!user) redirect('/login?next=/settings/credentials');

  const credentials = await getPlatformCredentials().catch(() => null);

  return (
    <Page
      title="Credentials"
      description="The email and password the applications the platform runs answer with."
      eyebrow="Settings"
    >
      <SettingsNav />

      <section>
        <SectionHeader
          title="One email, one password"
          description="The platform's identity, and the applications that answer to it."
        />
        {credentials ? (
          <CredentialsPanel
            platformEmail={credentials.platformEmail ?? user.email}
            applications={credentials.applications}
          />
        ) : (
          <Card className="p-4">
            <p className="text-sm text-text-muted">
              The credentials could not be read. Is the platform API answering?
            </p>
          </Card>
        )}
      </section>
    </Page>
  );
}
