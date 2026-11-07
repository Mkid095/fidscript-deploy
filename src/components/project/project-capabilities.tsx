import { Card, SectionHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/feedback';

/**
 * The capabilities.
 *
 * A capability is something the project can use beyond the shape. What is
 * shown here is what is **true** — and what the platform cannot do yet says
 * so, rather than showing a switch that would do nothing.
 */
export function ProjectCapabilities({ emailDomains }: { emailDomains: number }) {
  return (
    <section>
      <SectionHeader title="Capabilities" description="What else this project can use." />
      <Card className="divide-y divide-rail">
        <Capability
          name="Email"
          state={emailDomains > 0 ? 'On' : 'Off'}
          detail="Mail domains and mailboxes for this project."
        />
        <Capability name="WhatsApp" state="Not available yet" detail="Coming to the platform." />
        <Capability name="Packages" state="Not available yet" detail="Coming to the platform." />
      </Card>
    </section>
  );
}

function Capability({
  name,
  state,
  detail,
}: {
  name: string;
  state: string;
  detail: string;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
      <div className="min-w-0">
        <p className="text-sm font-medium text-text">{name}</p>
        <p className="mt-0.5 text-xs text-text-dim">{detail}</p>
      </div>
      <Badge tone={state === 'On' ? 'success' : 'neutral'}>{state}</Badge>
    </div>
  );
}
