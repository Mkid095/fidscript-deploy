import { EmptyState } from '@/components/ui/feedback';
import { Badge } from '@/components/ui/feedback';

/**
 * The project's members.
 *
 * The people the API says are in it, and the role each of them has.
 */
export function ProjectMembers({
  members,
}: {
  members: Array<{
    id: string;
    role: string;
    user: { id: string; email: string; name: string | null };
  }>;
}) {
  if (members.length === 0) {
    return (
      <EmptyState
        title="Nobody else is here yet"
        body="The owner's Members screen is where somebody is brought in."
      />
    );
  }

  return (
    <ul className="divide-y divide-rail">
      {members.map((member) => (
        <li
          key={member.id}
          className="flex items-center justify-between gap-4 px-4 py-3"
        >
          <div className="min-w-0">
            <p className="truncate text-sm text-text">
              {member.user.name ?? member.user.email}
            </p>
            {member.user.name ? (
              <p className="truncate text-xs text-text-dim">
                {member.user.email}
              </p>
            ) : null}
          </div>
          <Badge tone={roleTone(member.role)}>
            {member.role.toLowerCase()}
          </Badge>
        </li>
      ))}
    </ul>
  );
}

function roleTone(role: string): 'accent' | 'success' | 'neutral' {
  const lower = role.toLowerCase();
  if (lower === 'owner') return 'accent';
  if (lower === 'admin') return 'success';
  return 'neutral';
}
