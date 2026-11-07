import { applications } from '@/lib/api/platform';
import { Card, PageHeader, SectionHeader } from '@/components/ui/card';
import { Badge, EmptyState, ErrorState } from '@/components/ui/feedback';
import { SettingsNav } from '@/components/platform/settings-nav';

/**
 * The applications.
 *
 * The one-time thing, revisited: what this platform has, and whether it is
 * healthy. It is not in the top bar — it is a setting.
 */
export const metadata = { title: 'Applications · Settings' };

export default async function ApplicationsSettingsPage() {
  const apps = await applications().catch(() => null);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        title="Applications"
        description="What this platform has, and whether it is healthy."
      />
      <SettingsNav />

      {!apps ? (
        <ErrorState
          title="The platform did not answer"
          message="The applications could not be loaded. The platform may be restarting — try again in a moment."
        />
      ) : apps.length === 0 ? (
        <Card>
          <EmptyState title="No applications" body="The platform reports none." />
        </Card>
      ) : (
        <section>
          <SectionHeader title="Installed and installable" />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {apps.map((app) => (
              <Card key={app.id} className="p-4">
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-sm font-medium text-text">{app.title}</span>
                  <Badge tone={app.installed ? 'success' : 'neutral'}>
                    {app.installed ? 'Installed' : 'Not installed'}
                  </Badge>
                </div>
                <p className="mt-1.5 text-xs leading-relaxed text-text-muted">{app.summary}</p>
                <div className="mt-3 flex items-center gap-3">
                  {app.url ? (
                    <a
                      href={app.url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs text-accent hover:underline"
                    >
                      Open the console
                    </a>
                  ) : app.installed ? (
                    <span className="text-xs text-text-dim">No console — health only</span>
                  ) : null}
                  {app.requires.length > 0 ? (
                    <span className="text-xs text-text-dim">
                      Needs {app.requires.join(', ')}
                    </span>
                  ) : null}
                </div>
              </Card>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
