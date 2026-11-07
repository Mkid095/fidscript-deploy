'use client';

import { useState, useTransition } from 'react';

import { Button } from '@/components/ui/button';
import { Input, Select } from '@/components/ui/input';
import { Card, SectionHeader } from '@/components/ui/card';
import { ErrorState } from '@/components/ui/feedback';
import type { Discovery } from '@/lib/api/installation';

import { configurePlatformAction } from '@/app/(setup)/setup/actions';

/**
 * The administrator.
 *
 * The account the platform is entered with, and the token that says this
 * person is the one doing the setup. The token is the installer's: it was
 * printed once, and it is never stored anywhere.
 */
export function SetupAccountForm({
  discovery,
  onDone,
}: {
  discovery: Discovery | null;
  onDone: () => void;
}) {
  const [values, setValues] = useState({
    platformName: 'FIDScript',
    platformDomain: '',
    serverIp: discovery?.serverIp ?? '',
    adminEmail: discovery?.adminEmail ?? '',
    authMethod: 'PASSWORD' as 'PASSWORD' | 'MAGIC_CODE',
    adminPassword: '',
    setupPassword: '',
    cloudflareApiToken: '',
    dnsMode: 'manual',
  });
  const [setupToken, setSetupToken] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const set = (patch: Partial<typeof values>) => setValues({ ...values, ...patch });

  const configure = () => {
    setError(null);
    startTransition(async () => {
      const result = await configurePlatformAction(
        {
          platformName: values.platformName,
          platformDomain: values.platformDomain.trim(),
          serverIp: values.serverIp.trim(),
          adminEmail: values.adminEmail.trim(),
          authMethod: values.authMethod,
          ...(values.authMethod === 'PASSWORD' ? { adminPassword: values.adminPassword } : {}),
          ...(values.setupPassword ? { setupPassword: values.setupPassword } : {}),
          ...(values.cloudflareApiToken
            ? { cloudflareApiToken: values.cloudflareApiToken.trim() }
            : {}),
          dnsMode: values.dnsMode,
        },
        setupToken,
      );
      if (result.error) setError(result.error);
      else onDone();
    });
  };

  return (
    <section>
      <SectionHeader
        title="The administrator"
        description="Who enters the platform, and where it answers."
      />
      <Card className="space-y-4 p-4">
        <Input
          label="Platform name"
          value={values.platformName}
          onChange={(event) => set({ platformName: event.target.value })}
        />
        <Input
          label="Domain"
          hint="The address this platform answers on."
          value={values.platformDomain}
          onChange={(event) => set({ platformDomain: event.target.value })}
          placeholder="example.com"
        />
        <Input
          label="Server address"
          value={values.serverIp}
          onChange={(event) => set({ serverIp: event.target.value })}
        />
        <Input
          label="Administrator email"
          type="email"
          value={values.adminEmail}
          onChange={(event) => set({ adminEmail: event.target.value })}
        />
        <Select
          label="How people sign in"
          value={values.authMethod}
          onChange={(event) => set({ authMethod: event.target.value as 'PASSWORD' | 'MAGIC_CODE' })}
          options={[
            { value: 'PASSWORD', label: 'A password' },
            { value: 'MAGIC_CODE', label: 'A code sent to the email' },
          ]}
        />
        {values.authMethod === 'PASSWORD' ? (
          <Input
            label="Administrator password"
            type="password"
            hint="At least twelve characters."
            value={values.adminPassword}
            onChange={(event) => set({ adminPassword: event.target.value })}
          />
        ) : null}
        <Input
          label="Registration password"
          type="password"
          hint="Optional. It is the shared secret that gates registration."
          value={values.setupPassword}
          onChange={(event) => set({ setupPassword: event.target.value })}
        />
        <Input
          label="Cloudflare token"
          type="password"
          hint="Optional. With it, the DNS records are written for you."
          value={values.cloudflareApiToken}
          onChange={(event) => set({ cloudflareApiToken: event.target.value })}
        />
        <Input
          label="Setup token"
          type="password"
          hint="The installer printed it once. It is not stored."
          value={setupToken}
          onChange={(event) => setSetupToken(event.target.value)}
        />

        {error ? <ErrorState message={error} /> : null}

        <div className="flex justify-end gap-2">
          <Button
            variant="primary"
            onClick={configure}
            loading={pending}
            disabled={!values.platformDomain || !values.adminEmail || !setupToken}
          >
            Configure the platform
          </Button>
        </div>
      </Card>
    </section>
  );
}
