'use client';

import { useState, useTransition } from 'react';
import { QRCodeSVG } from 'qrcode.react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge, ErrorState } from '@/components/ui/feedback';
import { CodeBlock } from '@/components/ui/code-block';

import {
  disableMfaAction,
  enableMfaAction,
  newRecoveryCodesAction,
  startMfaSetupAction,
} from '@/app/(platform)/settings/actions';

/**
 * The second factor.
 *
 * Turning it on shows a code for the authenticator app to read, and the
 * secret beside it for the people who type it in by hand. The secret is
 * shown once — the platform keeps only what it needs to check a code.
 */
export function MfaPanel({
  enabled,
  recoveryCodesRemaining,
}: {
  enabled: boolean;
  recoveryCodesRemaining: number;
}) {
  const [secret, setSecret] = useState<string | null>(null);
  const [otpauthUrl, setOtpauthUrl] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [codes, setCodes] = useState<string[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const run = (action: () => Promise<{ ok?: boolean; error?: string }>, message?: string) => {
    setError(null);
    setNotice(null);
    startTransition(async () => {
      const result = await action();
      if (result.error) setError(result.error);
      else if (message) setNotice(message);
    });
  };

  if (!enabled && !secret) {
    return (
      <Card className="p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-medium text-text">Two-factor is not on</p>
            <p className="mt-0.5 max-w-xl text-xs leading-relaxed text-text-dim">
              With it on, a stolen password is not enough to sign in — the authenticator app
              answers as well.
            </p>
          </div>
          <Button
            variant="secondary"
            size="sm"
            loading={pending}
            onClick={() =>
              startTransition(async () => {
                setError(null);
                const result = await startMfaSetupAction();
                if (result.error) setError(result.error);
                else {
                  setSecret(result.secret ?? null);
                  setOtpauthUrl(result.otpauthUrl ?? null);
                }
              })
            }
          >
            Turn it on
          </Button>
        </div>
        {error ? (
          <div className="mt-3">
            <ErrorState message={error} />
          </div>
        ) : null}
      </Card>
    );
  }

  if (secret && otpauthUrl) {
    return (
      <Card className="space-y-5 p-4">
        <div>
          <p className="text-sm font-medium text-text">Scan this with your authenticator app</p>
          <p className="mt-0.5 text-xs text-text-dim">
            1Password, Google Authenticator, Authy — anything that reads an otpauth link.
          </p>
        </div>

        <div className="flex flex-col items-center gap-3">
          <div className="rounded-xl bg-white p-3">
            <QRCodeSVG value={otpauthUrl} size={176} level="M" />
          </div>
        </div>

        <CodeBlock label="Or type this secret in by hand" code={secret} />

        <div className="max-w-sm space-y-3">
          <Input
            label="Code from your app"
            value={code}
            onChange={(event) => setCode(event.target.value)}
            placeholder="123456"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={8}
            hint="The six digits your app shows right now."
          />
          {error ? <ErrorState message={error} /> : null}
          <div className="flex items-center gap-2">
            <Button
              variant="primary"
              size="sm"
              loading={pending}
              disabled={code.trim().length < 6}
              onClick={() => run(() => enableMfaAction(code))}
            >
              Turn it on
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSecret(null);
                setOtpauthUrl(null);
                setCode('');
              }}
            >
              Cancel
            </Button>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="space-y-4 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-text">Two-factor is on</p>
          <p className="mt-0.5 text-xs text-text-dim">
            {recoveryCodesRemaining} recovery code{recoveryCodesRemaining === 1 ? '' : 's'} left.
          </p>
        </div>
        <Badge tone="success">on</Badge>
      </div>

      {codes ? (
        <div className="rounded-md border border-success/40 bg-success/5 p-3">
          <p className="text-xs font-medium text-success">
            These are shown once. Keep them somewhere safe.
          </p>
          <ul className="mt-2 grid grid-cols-2 gap-1 font-mono text-xs text-text">
            {codes.map((entry) => (
              <li key={entry}>{entry}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {error ? <ErrorState message={error} /> : null}
      {notice ? <p className="text-xs text-success">{notice}</p> : null}

      <div className="flex flex-wrap items-end gap-3">
        <Button
          variant="outline"
          size="sm"
          loading={pending}
          onClick={() =>
            startTransition(async () => {
              setError(null);
              const result = await newRecoveryCodesAction();
              if (result.error) setError(result.error);
              else setCodes(result.codes ?? []);
            })
          }
        >
          New recovery codes
        </Button>
      </div>

      <div className="max-w-sm space-y-3 border-t border-rail pt-4">
        <Input
          label="Your password"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          hint="Turning two-factor off needs the account's password again."
        />
        <Button
          variant="ghost"
          size="sm"
          loading={pending}
          disabled={!password}
          onClick={() =>
            run(() => disableMfaAction({ password }), 'Two-factor is off.')
          }
        >
          Turn it off
        </Button>
      </div>
    </Card>
  );
}
