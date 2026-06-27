import { HugeiconsIcon } from '@hugeicons/react';
import {
  Rocket01Icon, Database01Icon, CpuIcon, Radio01Icon, Layers01Icon, Clock01Icon,
  Mail01Icon, HardDriveIcon, Key01Icon, Plug01Icon, Globe02Icon, Analytics01Icon,
} from '@hugeicons/core-free-icons';

// Each icon is chosen for what the service actually IS, not decoration.
const FEATURES = [
  { icon: Rocket01Icon, title: 'Deployments', desc: 'Push a Dockerfile repo; we build, route, health-check, and serve it on a wildcard TLS domain.' },
  { icon: Database01Icon, title: 'Databases', desc: 'Provision Postgres per project with PgBouncer pooling, encrypted creds, and connection limits.' },
  { icon: CpuIcon, title: 'Edge Functions', desc: 'Run Node & Python handlers in a sandboxed, resource-capped, no-network container — cold-start in <1s.' },
  { icon: Radio01Icon, title: 'Realtime', desc: 'Socket.io rooms with Redis adapter — broadcast platform events to connected clients live (fan-out).' },
  { icon: Layers01Icon, title: 'Queues', desc: 'Durable NATS JetStream queues with workers, dead-letter handling, and at-least-once delivery.' },
  { icon: Clock01Icon, title: 'Scheduler', desc: 'Cron jobs that survive restarts, backed by a Redis distributed lock so a job never fires twice.' },
  { icon: Mail01Icon, title: 'Email', desc: 'Stalwart SMTP/JMAP with domains, mailboxes, aliases, sender identities, and suppression lists.' },
  { icon: HardDriveIcon, title: 'Storage', desc: 'S3-compatible MinIO with per-project buckets, presigned URLs, and multi-provider routing.' },
  { icon: Key01Icon, title: 'BaaS Auth', desc: 'Email/password and magic-code auth — issue your own project-scoped JWTs. (OAuth available per project.)' },
  { icon: Plug01Icon, title: 'MCP & SDK', desc: 'Drive the whole platform from an LLM via MCP, or from code with the TypeScript SDK — one integration surface.' },
  { icon: Globe02Icon, title: 'Domains & TLS', desc: 'Cloudflare DNS automation with Traefik ACME DNS-01 / HTTP-01 for automatic certificates.' },
  { icon: Analytics01Icon, title: 'Monitoring', desc: 'Metrics, alert rules, and notification channels — observability built into the same console.' },
];

export function LandingFeatures() {
  return (
    <section id="features" className="relative mx-auto max-w-6xl px-6 py-20">
      <div className="mb-12 text-center">
        <h2 className="text-3xl font-bold tracking-tight text-[var(--text)] sm:text-4xl">
          Eleven services. <span className="text-[var(--accent)]">One install.</span>
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-sm text-[var(--text-muted)]">
          Everything you&apos;d otherwise stitch together from a dozen SaaS subscriptions — verified
          working, end to end, on a single box.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {FEATURES.map((f) => (
          <div
            key={f.title}
            className="glass-panel group rounded-xl p-5 transition hover:border-[var(--accent)]/20 hover:bg-[var(--surface-2)]"
          >
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg border border-[var(--accent)]/20 bg-[var(--accent)]/10 text-[var(--accent)] transition group-hover:scale-105">
              <HugeiconsIcon icon={f.icon} size={20} color="currentColor" />
            </div>
            <h3 className="mb-1 font-semibold text-[var(--text)]">{f.title}</h3>
            <p className="text-sm leading-relaxed text-[var(--text-muted)]">{f.desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
