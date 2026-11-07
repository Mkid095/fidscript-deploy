import { Card, SectionHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/feedback';
import { ProjectShapeForm } from '@/components/project/project-shape-form';
import type { InstantApp, ProjectShape } from '@/lib/api/types';

/**
 * "What this project is".
 *
 * The shape, the deployment switch, and the state of the backend that
 * belongs to it. The shape form is a client component; the backend's state
 * was read on the server, so it is real.
 */
export function ProjectShapeSection({
  projectId,
  shape,
  deploymentOn,
  instant,
}: {
  projectId: string;
  shape: ProjectShape;
  deploymentOn: boolean;
  instant: { available: boolean; dashboardUrl: string | null; app: InstantApp | null } | null;
}) {
  const wantsBackend = shape === 'BACKEND' || shape === 'BOTH';

  return (
    <section>
      <SectionHeader
        title="What this project is"
        description="The shape decides what this project has. The menu follows it."
      />
      <Card className="space-y-5 p-4">
        <ProjectShapeForm
          projectId={projectId}
          shape={shape}
          deploymentOn={deploymentOn}
        />

        <div className="border-t border-rail pt-4">
          <p className="text-xs font-medium text-text-muted">The backend</p>
          {wantsBackend ? (
            instant?.app ? (
              <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm text-text">
                  <span className="font-medium">{instant.app.title}</span>{' '}
                  <span className="text-text-dim">{instant.app.appId}</span>
                </p>
                <div className="flex items-center gap-2">
                  <Badge tone="success">{instant.app.status}</Badge>
                  {instant.dashboardUrl ? (
                    <a
                      href={instant.dashboardUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs text-accent hover:underline"
                    >
                      Open the console
                    </a>
                  ) : null}
                </div>
              </div>
            ) : (
              <p className="mt-2 text-sm text-text-muted">
                {instant?.available
                  ? 'No application backend yet. Save the shape and it is created.'
                  : 'The platform holds no Instant credential, so no backend can be created yet.'}
              </p>
            )
          ) : (
            <p className="mt-2 text-sm text-text-muted">
              This project has no backend. If it had one, the app and its data would be kept.
            </p>
          )}
        </div>
      </Card>
    </section>
  );
}
