import { redirect } from 'next/navigation';

import { getProject } from '@/lib/api/project';
import { getWhatsappState } from '@/lib/api/whatsapp';
import { applications } from '@/lib/api/platform';
import { Card, PageHeader, SectionHeader } from '@/components/ui/card';
import { Page } from '@/components/ui/page';
import { WhatsappPanel } from '@/components/project/whatsapp-panel';

export const metadata = { title: 'WhatsApp' };

/**
 * The project's WhatsApp.
 *
 * The messaging is the WhatsApp platform's; this is the project's door to
 * it — the key it holds, and the instance it owns.
 */
export default async function ProjectWhatsAppPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;

  const project = await getProject(projectId).catch(() => null);
  if (!project) redirect('/projects');

  const [state, catalogue] = await Promise.all([
    getWhatsappState(project.id),
    applications().catch(() => []),
  ]);

  const whatsapp = catalogue.find((application) => application.id === 'whatsapp');

  return (
    <Page>
      <PageHeader
        title="WhatsApp"
        description="The messaging side of this project — the instances it holds, and how they stand."
      />

      <section>
        <SectionHeader
          title="The connection"
          description="The key this project reaches the WhatsApp platform with."
        />
        <WhatsappPanel
          projectId={project.id}
          state={state}
          consoleUrl={whatsapp?.url ?? null}
        />
      </section>

      <section>
        <SectionHeader
          title="Advanced"
          description="The settings the WhatsApp platform already has an interface for."
        />
        <Card className="p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-text-muted">
              The channels, the tokens and the webhooks live in the WhatsApp platform&apos;s own
              console. Nothing is duplicated here — this screen is the project&apos;s view of them.
            </p>
            {whatsapp?.url ? (
              <a
                href={whatsapp.url}
                target="_blank"
                rel="noreferrer"
                className="text-xs text-accent hover:underline"
              >
                Open the console
              </a>
            ) : null}
          </div>
        </Card>
      </section>
    </Page>
  );
}
