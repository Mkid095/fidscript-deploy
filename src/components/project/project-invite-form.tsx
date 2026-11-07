'use client';

import { useState, useTransition } from 'react';

import { Button } from '@/components/ui/button';
import { Input, Select } from '@/components/ui/input';
import { ErrorState } from '@/components/ui/feedback';

import { inviteMemberAction } from '@/app/(project)/projects/[projectId]/members/actions';

/**
 * Inviting somebody into the project.
 *
 * The platform does not send the mail — it makes the invitation and hands
 * back the link, so the link is shown here to be sent on.
 */
export function ProjectInviteForm({ projectId }: { projectId: string }) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('developer');
  const [error, setError] = useState<string | null>(null);
  const [link, setLink] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const invite = () => {
    setError(null);
    setLink(null);
    startTransition(async () => {
      const result = await inviteMemberAction(projectId, { email, role });
      if (result.error) {
        setError(result.error);
        return;
      }
      if (result.token) {
        setLink(`${window.location.origin}/invitations/accept?token=${result.token}`);
        setEmail('');
      }
    });
  };

  return (
    <div className="space-y-4 p-4">
      <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
        <Input
          label="Email"
          type="email"
          placeholder="colleague@example.com"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
        <Select
          label="Role"
          value={role}
          onChange={(event) => setRole(event.target.value)}
          options={[
            { value: 'admin', label: 'Admin' },
            { value: 'developer', label: 'Developer' },
            { value: 'viewer', label: 'Viewer' },
          ]}
          className="sm:w-40"
        />
      </div>

      <Button variant="primary" onClick={invite} loading={pending} disabled={!email.trim()}>
        Invite
      </Button>

      {error ? <ErrorState message={error} /> : null}

      {link ? (
        <div className="rounded-md border border-success/40 bg-success/5 p-3">
          <p className="text-xs font-medium text-success">The invitation is ready.</p>
          <p className="mt-1 break-all font-mono text-xs text-text-muted">{link}</p>
          <p className="mt-1 text-xs text-text-dim">
            It is valid for seven days. The platform does not send mail — send it yourself.
          </p>
        </div>
      ) : null}
    </div>
  );
}
