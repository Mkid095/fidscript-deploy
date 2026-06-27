import type { ReactNode } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  Rocket01Icon, ComputerTerminal01Icon, CpuIcon, Database01Icon, BookOpen01Icon, Settings01Icon,
} from '@hugeicons/core-free-icons';

/** Small presentational helpers so doc pages read like prose, not JSX soup. */
export const H2 = ({ children }: { children: ReactNode }) => (
  <h2 className="mt-8 mb-3 text-xl font-bold tracking-tight text-[var(--text)]">{children}</h2>
);
export const P = ({ children }: { children: ReactNode }) => (
  <p className="mb-4 leading-relaxed text-[var(--text-muted)]">{children}</p>
);
export const Code = ({ children }: { children: ReactNode }) => (
  <code className="rounded bg-[var(--surface-3)] px-1.5 py-0.5 font-mono text-[0.85em] text-[var(--accent)]">{children}</code>
);
export const Pre = ({ children }: { children: ReactNode }) => (
  <pre className="my-4 overflow-x-auto rounded-xl border border-[var(--rail)] bg-[var(--canvas)] p-4 font-mono text-sm text-[var(--text-muted)]">
    {children}
  </pre>
);

export type Doc = {
  slug: string;
  title: string;
  category: string;
  icon: typeof Rocket01Icon;
  Content: () => ReactNode;
};

export const DOCS: Doc[] = [
  {
    slug: 'getting-started',
    title: 'Getting Started',
    category: 'Get Started',
    icon: BookOpen01Icon,
    Content: () => (
      <>
        <H2>What is FIDScript?</H2>
        <P>
          FIDScript is a self-hosted developer operating system — the BaaS you&apos;d normally rent
          from a dozen SaaS vendors (deployments, databases, edge functions, realtime, queues,
          cron, mail, storage), bundled into one open-source stack that runs entirely on your own VPS.
        </P>
        <H2>Prerequisites</H2>
        <P>
          A fresh <strong className="text-[var(--text)]">Ubuntu 22.04 / 24.04</strong> (or Debian 11/12) VPS
          with root access and at least 4&nbsp;GB of RAM. Docker is installed automatically if missing.
        </P>
        <H2>One-command install</H2>
        <Pre>curl -sSL https://deploy.fidscript.com/install.sh | bash</Pre>
        <P>
          The installer verifies the OS, installs Docker, pulls every container, asks for your domain
          and mail settings, verifies DNS, starts the stack, runs health checks, and prints your
          dashboard URL plus a temporary admin login.
        </P>
      </>
    ),
  },
  {
    slug: 'installation',
    title: 'Installation',
    category: 'Get Started',
    icon: ComputerTerminal01Icon,
    Content: () => (
      <>
        <H2>1. Provision a VPS</H2>
        <P>Spin up an Ubuntu 22.04 or 24.04 server. Note its public IP address.</P>
        <H2>2. Point a domain at it (optional but recommended)</H2>
        <P>
          Create an <Code>A record</Code> for your domain (e.g. <Code>deploy.example.com</Code>) and a
          wildcard <Code>*.apps.example.com</Code> pointing to the server IP. The installer verifies
          DNS before relying on it; if it isn&apos;t live yet, you get an <Code>http://&lt;IP&gt;</Code> fallback URL.
        </P>
        <H2>3. Run the installer</H2>
        <Pre>ssh root@your-vps
curl -sSL https://deploy.fidscript.com/install.sh | bash</Pre>
        <P>
          You&apos;ll be asked for: your domain, an admin email, a Cloudflare API token (for DNS + TLS),
          and your server IP (auto-detected where possible). The rest is automated.
        </P>
        <H2>4. First login</H2>
        <P>
          Open the printed URL. On first login you&apos;ll set a permanent password, then land on the
          Projects page to create your first project.
        </P>
      </>
    ),
  },
  {
    slug: 'deploy-an-app',
    title: 'Deploy an Application',
    category: 'Build',
    icon: Rocket01Icon,
    Content: () => (
      <>
        <H2>Bring a Dockerfile</H2>
        <P>
          FIDScript builds any repository that ships a <Code>Dockerfile</Code> in its root. Clone or
          point a deployment at your git URL; the worker clones, builds with BuildKit, and runs the
          image on the shared network with automatic TLS via Traefik.
        </P>
        <H2>Via the API</H2>
        <Pre>{`curl -X POST https://deploy.example.com/api/v1/projects/<id>/deployments \\
  -H "Authorization: Bearer <token>" \\
  -H "Content-Type: application/json" \\
  -d '{ "source": { "type": "git", "git": { "url": "https://github.com/you/app.git" } }, "branch": "main" }'`}</Pre>
        <P>
          Watch the state machine move <Code>pending → queued → building → success</Code> and receive
          a <Code>https://&lt;slug&gt;.apps.example.com</Code> URL.
        </P>
      </>
    ),
  },
  {
    slug: 'edge-functions',
    title: 'Edge Functions',
    category: 'Build',
    icon: CpuIcon,
    Content: () => (
      <>
        <H2>Sandboxed handlers</H2>
        <P>
          Write Node or Python handlers that run in a resource-capped, read-only, no-network
          container. Cold starts are under a second.
        </P>
        <Pre>{`exports.handler = async (event) => ({
  statusCode: 200,
  body: JSON.stringify({ ok: true, echo: event }),
});`}</Pre>
        <H2>Invoke</H2>
        <Pre>{`curl -X POST https://deploy.example.com/api/v1/projects/<id>/functions/<fn>/invoke \\
  -H "Authorization: Bearer <token>" \\
  -d '{ "payload": { "hello": "world" } }'`}</Pre>
      </>
    ),
  },
  {
    slug: 'services',
    title: 'Services Overview',
    category: 'Reference',
    icon: Database01Icon,
    Content: () => (
      <>
        <H2>Eleven services, one stack</H2>
        <P>Every project gets access to the full platform surface:</P>
        <ul className="mb-4 space-y-1.5 text-[var(--text-muted)]">
          <li>• <strong className="text-[var(--text)]">Deployments</strong> — Dockerfile builds, routing, health checks</li>
          <li>• <strong className="text-[var(--text)]">Databases</strong> — Postgres + PgBouncer per project</li>
          <li>• <strong className="text-[var(--text)]">Edge Functions</strong> — sandboxed Node/Python</li>
          <li>• <strong className="text-[var(--text)]">Realtime</strong> — socket.io rooms + Redis adapter</li>
          <li>• <strong className="text-[var(--text)]">Queues</strong> — NATS JetStream durable queues</li>
          <li>• <strong className="text-[var(--text)]">Scheduler</strong> — cron that survives restarts</li>
          <li>• <strong className="text-[var(--text)]">Email</strong> — Stalwart SMTP/JMAP</li>
          <li>• <strong className="text-[var(--text)]">Storage</strong> — S3-compatible MinIO</li>
          <li>• <strong className="text-[var(--text)]">Auth</strong> — email/password + magic-code</li>
          <li>• <strong className="text-[var(--text)]">Domains &amp; TLS</strong> — Cloudflare + Traefik ACME</li>
          <li>• <strong className="text-[var(--text)]">Monitoring</strong> — metrics, alerts, channels</li>
        </ul>
      </>
    ),
  },
  {
    slug: 'configuration',
    title: 'Configuration',
    category: 'Reference',
    icon: Settings01Icon,
    Content: () => (
      <>
        <H2>Where things live</H2>
        <P>
          Installer files: <Code>/opt/fidscript</Code>. Data volumes: <Code>/data/fidscript</Code>.
          Secrets are generated into <Code>/opt/fidscript/docker/secrets</Code> and never committed.
        </P>
        <H2>Updating</H2>
        <Pre>{`cd /opt/fidscript/docker
git -C /opt/fidscript-deploy pull
docker compose up -d --build`}</Pre>
        <H2>Logs &amp; status</H2>
        <Pre>{`docker compose -f /opt/fidscript/docker/docker-compose.yml logs -f
/opt/fidscript/scripts/health-check.sh`}</Pre>
      </>
    ),
  },
];

export function getDoc(slug: string): Doc | undefined {
  return DOCS.find((d) => d.slug === slug);
}
