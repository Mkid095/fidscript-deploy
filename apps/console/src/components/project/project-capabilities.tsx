import Link from 'next/link';

import { Card, SectionHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/feedback';

/**
 * The capabilities.
 *
 * A capability is something the project can use beyond the shape. What is
 * shown here is what is **true** — and what the platform cannot do yet says
 * so, rather than showing a switch that would do nothing.
 *
 * Email is on when the project has a mail domain: that is what "on" means
 * here, and the way to turn it on is to add one.
 */
export function ProjectCapabilities({
  emailDomains,
  projectSlug,
}: {
  emailDomains: number;
  projectSlug: string;
}) {
  return (
    <section>
      <SectionHeader title="Capabilities" description="What else this project can use." />
      <Card className="divide-y divide-rail">
        <Capability
          name="Email"
          state={emailDomains > 0 ? 'On' : 'Off'}
          detail="Mail domains and mailboxes for this project."
          href={`/projects/${projectSlug}/email`}
        />
        <Capability
          name="WhatsApp"
          state="Not available yet"
          detail="The instances live in the WhatsApp platform's console."
          href={`/projects/${projectSlug}/whatsapp`}
        />
        <Capability
          name="Packages"
          state="On"
          detail="The registry, and how to publish to it."
          href={`/projects/${projectSlug}/packages`}
        />
      </Card>
    </section>
  );
}

function Capability({
  name,
  state,
  detail,
  href,
}: {
  name: string;
  state: string;
  detail: string;
  href?: string;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
      <div className="min-w-0">
        <p className="text-sm font-medium text-text">{name}</p>
        <p className="mt-0.5 text-xs text-text-dim">{detail}</p>
      </div>
      <div className="flex items-center gap-3">
        {href ? (
          <Link href={href} className="text-xs text-accent hover:underline">
            {state === 'On' ? 'Open' : 'Turn on'}
          </Link>
        ) : null}
        <Badge tone={state === 'On' ? 'success' : 'neutral'}>{state}</Badge>
      </div>
    </div>
  );
}
