import { redirect } from 'next/navigation';

import { getProject } from '@/lib/api/project';
import { applications } from '@/lib/api/platform';
import { Card, PageHeader, SectionHeader } from '@/components/ui/card';
import { Page } from '@/components/ui/page';
import { Badge, EmptyState } from '@/components/ui/feedback';
import { Button } from '@/components/ui/button';

export const metadata = { title: 'WhatsApp' };

/**
 * The project's WhatsApp.
 *
 * The platform does not keep project-scoped WhatsApp instances yet — the
 * WhatsApp platform is a separate application with its own console, and it
 * is where the instances are made.
 *
 * So this screen does not pretend. It says what is missing and gives the
 * way out: the console that does it today.
 */
export default async function ProjectWhatsAppPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;

  const project = await getProject(projectId).catch(() => null);
  if (!project) redirect('/projects');

  const whatsapp = (await applications().catch(() => [])).find(
    (application) => application.id === 'whatsapp',
  );

  return (
    <Page>
      <PageHeader
        title="WhatsApp"
        description="The messaging side of this project."
      />

      <section>
        <SectionHeader title="Instances" description="The phones this project talks through." />
        <Card>
          <EmptyState
            title="The platform keeps no instances yet"
            body="Instances belong to the WhatsApp platform, which has its own console. When the platform keeps them per project, they will be listed here — paired, connected and all."
          />
        </Card>
      </section>

      <section>
        <SectionHeader title="Advanced" description="The console that does this today." />
        <Card className="p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-medium text-text">{whatsapp?.title ?? 'WhatsApp platform'}</p>
              <p className="mt-0.5 text-xs text-text-dim">
                {whatsapp?.summary ?? 'The WhatsApp application of this platform.'}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge tone={whatsapp?.installed ? 'success' : 'neutral'}>
                {whatsapp?.installed ? 'installed' : 'not installed'}
              </Badge>
              {whatsapp?.url ? (
                <a href={whatsapp.url} target="_blank" rel="noreferrer">
                  <Button variant="secondary" size="sm">
                    Open the console
                  </Button>
                </a>
              ) : null}
            </div>
          </div>
        </Card>
      </section>
    </Page>
  );
}
