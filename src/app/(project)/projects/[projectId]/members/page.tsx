import { redirect } from 'next/navigation';

import { getProject, getProjectMembers } from '@/lib/api/project';
import { Card, PageHeader, SectionHeader } from '@/components/ui/card';
import { Badge, EmptyState, ErrorState } from '@/components/ui/feedback';
import { ProjectInviteForm } from '@/components/project/project-invite-form';

export const metadata = { title: 'Members' };

/**
 * The project's members.
 *
 * The people the API says are in it, and the way to bring somebody else in.
 */
export default async function ProjectMembersPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;

  const project = await getProject(projectId).catch(() => null);
  if (!project) redirect('/projects');

  const role = (project.role ?? 'viewer').toLowerCase();
  const canInvite = role === 'owner' || role === 'admin';

  const members = await getProjectMembers(project.id).catch(() => []);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        title="Members"
        description={`${members.length + 1} in this project, including the owner.`}
      />

      <section>
        <SectionHeader title="Who is here" />
        <Card>
          {members.length === 0 ? (
            <EmptyState
              title="Only you"
              body="Nobody else has been brought in yet."
            />
          ) : (
            <ul className="divide-y divide-rail">
              {members.map((member) => (
                <li key={member.id} className="flex items-center justify-between gap-4 px-4 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm text-text">
                      {member.user.name ?? member.user.email}
                    </p>
                    {member.user.name ? (
                      <p className="truncate text-xs text-text-dim">{member.user.email}</p>
                    ) : null}
                  </div>
                  <Badge tone={member.role === 'admin' ? 'success' : 'neutral'}>
                    {member.role.toLowerCase()}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </section>

      {canInvite ? (
        <section>
          <SectionHeader
            title="Invite somebody"
            description="They get a link that is valid for seven days."
          />
          <Card>
            <ProjectInviteForm projectId={project.id} />
          </Card>
        </section>
      ) : (
        <ErrorState
          title="Only the owner and the admins can invite"
          message="Ask one of them to bring somebody in."
        />
      )}
    </div>
  );
}
