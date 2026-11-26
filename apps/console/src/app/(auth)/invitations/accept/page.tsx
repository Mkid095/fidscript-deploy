import { AcceptInvitationPanel } from '@/components/auth/accept-invitation-panel';

export const metadata = { title: 'Accept the invitation' };

/**
 * Accepting an invitation.
 *
 * The link that was sent carries the token; this screen spends it and lands
 * the person in the project.
 */
export default async function AcceptInvitationPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  return (
    <div>
      <h1 className="text-xl font-semibold tracking-tight text-text">
        Accept the invitation
      </h1>
      <p className="mt-1 text-sm text-text-muted">
        You have been invited to work in a FIDScript project.
      </p>
      <div className="mt-4">
        <AcceptInvitationPanel token={token ?? ''} />
      </div>
    </div>
  );
}
