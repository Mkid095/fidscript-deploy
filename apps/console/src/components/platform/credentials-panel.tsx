'use client';

import { useState, useTransition } from 'react';

import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/feedback';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  applyCredentialsAction,
  verifyCredentialsAction,
} from '@/app/(platform)/settings/credentials/actions';
import type { ApplicationCredential } from '@/lib/api/platform';

/**
 * The applications' credentials, as one decision.
 *
 * The platform's email and password sit at the top; the applications follow,
 * each saying what it answers with. The toggle is the decision itself — when
 * it is on, "Apply" pushes the platform's identity onto every application
 * that takes its credential from the platform. "Check" asks every
 * application live whether the platform's password opens it.
 */
export function CredentialsPanel({
  platformEmail,
  applications,
}: {
  platformEmail: string;
  applications: ApplicationCredential[];
}) {
  const [sameEverywhere, setSameEverywhere] = useState(true);
  const [password, setPassword] = useState('');
  const [checked, setChecked] = useState<Array<{
    id: string;
    opens: boolean | null;
    detail?: string;
  }> | null>(null);
  const [applied, setApplied] = useState<Array<{
    id: string;
    applied: boolean | 'manual';
    detail?: string;
  }> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const verify = () => {
    setError(null);
    startTransition(async () => {
      const response = await verifyCredentialsAction(platformEmail, password);
      if (response.error) setError(response.error);
      else setChecked(response.results ?? null);
    });
  };

  const apply = () => {
    setError(null);
    startTransition(async () => {
      const response = await applyCredentialsAction(platformEmail, password);
      if (response.error) setError(response.error);
      else setApplied(response.results ?? null);
    });
  };

  const verdictFor = (id: string) => {
    const check = checked?.find((entry) => entry.id === id);
    const done = applied?.find((entry) => entry.id === id);
    if (done) {
      if (done.applied === true)
        return { tone: 'success' as const, text: 'applied' };
      if (done.applied === 'manual')
        return { tone: 'info' as const, text: 'manual' };
      return { tone: 'warning' as const, text: 'not applied' };
    }
    if (check) {
      if (check.opens === true)
        return { tone: 'success' as const, text: 'opens' };
      if (check.opens === false)
        return { tone: 'warning' as const, text: 'refuses' };
      return { tone: 'neutral' as const, text: 'cannot check' };
    }
    return null;
  };

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-medium text-text">
              The platform&apos;s identity
            </p>
            <p className="mt-0.5 font-mono text-xs text-text-dim">
              {platformEmail}
            </p>
          </div>
          <label className="flex cursor-pointer items-center gap-2 text-xs text-text-muted">
            <input
              type="checkbox"
              checked={sameEverywhere}
              onChange={(event) => setSameEverywhere(event.target.checked)}
              className="accent-accent"
            />
            Use the same password for the applications
          </label>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Input
            type="password"
            placeholder="The platform password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="max-w-xs"
          />
          <Button
            variant="secondary"
            size="sm"
            onClick={verify}
            disabled={pending}
          >
            Check every application
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={apply}
            disabled={pending || !sameEverywhere}
            title={
              sameEverywhere
                ? undefined
                : 'The toggle is off — each application keeps its own.'
            }
          >
            Apply the platform&apos;s identity
          </Button>
        </div>
        {error ? <p className="mt-2 text-xs text-danger">{error}</p> : null}
        {!sameEverywhere ? (
          <p className="mt-2 text-xs text-text-muted">
            Each application keeps the password it answers with. Nothing is
            applied.
          </p>
        ) : null}
      </Card>

      <Card className="divide-y divide-rail">
        {applications.map((application) => {
          const verdict = verdictFor(application.id);
          return (
            <div key={application.id} className="px-4 py-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-text">
                    {application.label}
                  </p>
                  <p className="mt-0.5 truncate font-mono text-xs text-text-dim">
                    {application.account ?? '—'}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {verdict ? (
                    <Badge tone={verdict.tone}>{verdict.text}</Badge>
                  ) : null}
                  {application.authType === 'magic-code' ? (
                    <Badge tone="info">magic code</Badge>
                  ) : (
                    <Badge tone="neutral">{application.passwordSource}</Badge>
                  )}
                  {application.consoleUrl ? (
                    <a
                      href={application.consoleUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs text-accent hover:underline"
                    >
                      Open
                    </a>
                  ) : null}
                </div>
              </div>
              {application.note ? (
                <p className="mt-1.5 text-xs leading-relaxed text-text-muted">
                  {application.note}
                </p>
              ) : null}
              {applied
                ? applied
                    .filter(
                      (entry) => entry.id === application.id && entry.detail,
                    )
                    .map((entry) => (
                      <p
                        key={entry.id}
                        className="mt-1.5 text-xs leading-relaxed text-text-muted"
                      >
                        {entry.detail}
                      </p>
                    ))
                : null}
              {checked
                ? checked
                    .filter(
                      (entry) => entry.id === application.id && entry.detail,
                    )
                    .map((entry) => (
                      <p
                        key={`check-${entry.id}`}
                        className="mt-1.5 text-xs leading-relaxed text-text-muted"
                      >
                        {entry.detail}
                      </p>
                    ))
                : null}
            </div>
          );
        })}
      </Card>
    </div>
  );
}
