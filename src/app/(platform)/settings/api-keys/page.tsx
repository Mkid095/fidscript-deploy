import { apiKeys } from '@/lib/api/platform';
import { Card, PageHeader, SectionHeader } from '@/components/ui/card';
import { Page } from '@/components/ui/page';
import { Badge, EmptyState, ErrorState } from '@/components/ui/feedback';
import { SettingsNav } from '@/components/platform/settings-nav';

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
    <Page>
      <PageHeader
        title="API keys & MCP"
        description="The keys that act as you, and the agent connections."
      />
      <SettingsNav />

      <section>
        <SectionHeader title="Your keys" />
        {!keys ? (
          <ErrorState
            title="The platform did not answer"
            message="The keys could not be loaded. The platform may be restarting — try again in a moment."
          />
        ) : keys.length === 0 ? (
          <Card>
            <EmptyState
              title="No keys yet"
              body="A key acts as you, from a script or an agent."
            />
          </Card>
        ) : (
          <Card>
            <ul className="divide-y divide-rail">
              {keys.map((key) => (
                <li key={key.id} className="flex items-center justify-between gap-4 px-4 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm text-text">{key.name}</p>
                    <p className="truncate text-xs text-text-dim">
                      {key.permissions.length > 0 ? key.permissions.join(', ') : 'No scopes'} · created{' '}
                      {new Date(key.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  {key.lastUsedAt ? (
                    <Badge tone="neutral">Used {new Date(key.lastUsedAt).toLocaleDateString()}</Badge>
                  ) : (
                    <Badge tone="neutral">Never used</Badge>
                  )}
                </li>
              ))}
            </ul>
          </Card>
        )}
      </section>
    </Page>
  );
}
