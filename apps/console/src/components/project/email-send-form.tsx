'use client';

import { useState, useTransition } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ErrorState } from '@/components/ui/feedback';

import { sendTestEmailAction } from '@/app/(project)/projects/[projectId]/email/actions';

/**
 * Sending a test.
 *
 * The point is not the message — it is that the platform's mail really
 * carries it.
 */
export function EmailSendForm({ projectId, senders }: { projectId: string; senders: string[] }) {
  const [from, setFrom] = useState(senders[0] ?? '');
  const [to, setTo] = useState('');
  const [subject, setSubject] = useState('A test from FIDScript');
  const [text, setText] = useState('This message was sent by the FIDScript console.');
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [pending, startTransition] = useTransition();

  const send = () => {
    setError(null);
    setSent(false);
    startTransition(async () => {
      const result = await sendTestEmailAction(projectId, { from, to, subject, text });
      if (result.error) setError(result.error);
      else setSent(true);
    });
  };

  if (senders.length === 0) {
    return (
      <p className="px-4 py-6 text-sm text-text-muted">
        There is no mailbox to send from yet. Make one, then send a test.
      </p>
    );
  }

  return (
    <div className="max-w-xl space-y-4 p-4">
      <Input label="From" value={from} onChange={(event) => setFrom(event.target.value)} />
      <Input
        label="To"
        type="email"
        value={to}
        onChange={(event) => setTo(event.target.value)}
        placeholder="you@example.com"
      />
      <Input label="Subject" value={subject} onChange={(event) => setSubject(event.target.value)} />
      <Input label="Message" value={text} onChange={(event) => setText(event.target.value)} />

      {error ? <ErrorState message={error} /> : null}
      {sent ? <p className="text-xs text-success">The message was handed to the platform.</p> : null}

      <Button variant="primary" onClick={send} loading={pending} disabled={!from || !to}>
        Send it
      </Button>
    </div>
  );
}
