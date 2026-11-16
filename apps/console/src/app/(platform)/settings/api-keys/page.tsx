import { apiKeys } from '@/lib/api/platform';
import { SectionHeader } from '@/components/ui/card';
import { Page } from '@/components/ui/page';
import { ErrorState } from '@/components/ui/feedback';
import { SettingsNav } from '@/components/platform/settings-nav';
import { ApiKeysPanel } from '@/components/platform/api-keys-panel';

/**
 * The platform's API keys.
 *
 * A key is a credential, so it lives in the settings and not in a menu
 * somebody reaches for every day.
 */
export const metadata = { title: 'API keys · Settings' };

export default async function ApiKeysSettingsPage() {
  const keys = await apiKeys().catch(() => null);

  return (
    <Page
      title="API keys & MCP"
      description="The keys that act as you, and the agent connections."
    >
      <SettingsNav />

      <section>
        <SectionHeader
          title="Your keys"
          description="A key acts as you — from a script, from the command line, or from an agent."
        />
        {!keys ? (
          <ErrorState
            title="The platform did not answer"
            message="The keys could not be loaded. The platform may be restarting — try again in a moment."
          />
        ) : (
          <ApiKeysPanel keys={keys} />
        )}
      </section>
    </Page>
  );
}
