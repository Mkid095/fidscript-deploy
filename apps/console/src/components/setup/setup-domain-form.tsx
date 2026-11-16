'use client';

import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

/**
 * The domain, and the account that holds it.
 *
 * With a Cloudflare token, the platform writes the records itself — the
 * dashboard answers on the domain without the person touching a registrar.
 * Without one, the records are listed and the person sets them.
 */
export function SetupDomainForm({
  domain,
  cloudflareToken,
  setupToken,
  onChange,
}: {
  domain: string;
  cloudflareToken: string;
  setupToken: string;
  onChange: (next: {
    domain?: string;
    cloudflareToken?: string;
    setupToken?: string;
  }) => void;
}) {
  return (
    <Card className="max-w-xl space-y-4 p-5">
      <div>
        <h2 className="text-sm font-semibold text-text">The domain</h2>
        <p className="mt-1 text-xs leading-relaxed text-text-muted">
          The address this platform answers on. Everything — the dashboard, the
          API, the mail — is a subdomain of it.
        </p>
      </div>

      <Input
        label="Domain"
        placeholder="example.com"
        value={domain}
        onChange={(event) => onChange({ domain: event.target.value })}
        hint="Not the IP address — the name people will use."
      />

      <Input
        label="Cloudflare API token"
        type="password"
        placeholder="Optional"
        value={cloudflareToken}
        onChange={(event) => onChange({ cloudflareToken: event.target.value })}
        hint="With it, the platform writes the DNS records itself, and the domain works when it is done. Without it, the records are listed for you to set by hand."
      />

      <Input
        label="Setup token"
        type="password"
        placeholder="From the installer"
        value={setupToken}
        onChange={(event) => onChange({ setupToken: event.target.value })}
        hint="The installer printed it once. It is what says you are the one doing the setup."
      />
    </Card>
  );
}
