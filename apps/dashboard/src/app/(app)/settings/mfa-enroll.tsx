'use client';

/**
 * Turning two-factor on.
 *
 * The API hands over a secret and an otpauth URL; the URL is what the
 * authenticator app reads, as a QR code. The secret is shown too, because
 * some people enter it by hand — and because the API returns it once and
 * only once.
 */
import { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';

import { Button, Input, CodeBlock } from '@fidscript/ui';

interface MfaEnrollProps {
  secret: string;
  otpauthUrl: string;
  submitting: boolean;
  error?: string;
  onVerify: (code: string) => Promise<void>;
  onCancel: () => void;
}

export function MfaEnroll({ secret, otpauthUrl, submitting, error, onVerify, onCancel }: MfaEnrollProps) {
  const [code, setCode] = useState('');

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col items-center gap-3">
        <div className="rounded-xl bg-white p-3">
          <QRCodeSVG value={otpauthUrl} size={176} level="M" />
        </div>
        <p className="text-xs text-[var(--text-muted)] text-center">
          Scan this with your authenticator app — 1Password, Google Authenticator, Authy, or
          anything that reads an otpauth link.
        </p>
      </div>

      <CodeBlock
        code={secret}
        language="text"
        label="Or type this secret in by hand"
      />

      <form
        onSubmit={(e) => { e.preventDefault(); void onVerify(code.trim()); }}
        noValidate
        className="flex flex-col gap-4"
      >
        <Input
          label="Code from your app"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="123456"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={8}
          error={error}
          hint="The six digits your app shows right now."
        />
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" size="sm" onClick={onCancel}>Cancel</Button>
          <Button type="submit" variant="primary" size="sm" loading={submitting} disabled={code.trim().length < 6}>
            Turn on
          </Button>
        </div>
      </form>
    </div>
  );
}
