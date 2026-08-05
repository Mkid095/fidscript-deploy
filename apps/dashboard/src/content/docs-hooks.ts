import {
  Rocket01Icon, ComputerTerminal01Icon, CpuIcon, Database01Icon, BookOpen01Icon, Settings01Icon,
} from '@hugeicons/core-free-icons';

/* ─── Doc type + registry (pure data — no JSX) ───────────────────────────── */

export type Doc = {
  slug: string;
  title: string;
  category: string;
  icon: typeof Rocket01Icon;
  contentHtml: string;
};

export const DOCS: Doc[] = [
  {
    slug: 'getting-started',
    title: 'Getting Started',
    category: 'Get Started',
    icon: BookOpen01Icon,
    contentHtml: `
      <h2>What is FIDScript?</h2>
      <p>
        FIDScript is a self-hosted developer operating system — the BaaS you'd normally rent
        from a dozen SaaS vendors (deployments, databases, edge functions, realtime, queues,
        cron, mail, storage), bundled into one open-source stack that runs entirely on your own VPS.
      </p>
      <h2>Prerequisites</h2>
      <p>
        A fresh <strong>Ubuntu 22.04 / 24.04</strong> (or Debian 11/12) VPS
        with root access and at least 4&nbsp;GB of RAM. Docker is installed automatically if missing.
      </p>
      <h2>One-command install</h2>
      <pre>curl -sSL https://deploy.fidscript.com/install.sh | bash</pre>
      <p>
        The installer verifies the OS, installs Docker, pulls every container, asks for your domain
        and mail settings, verifies DNS, starts the stack, runs health checks, and prints your
        dashboard URL plus a temporary admin login.
      </p>
    `,
  },
  {
    slug: 'installation',
    title: 'Installation',
    category: 'Get Started',
    icon: ComputerTerminal01Icon,
    contentHtml: `
      <h2>1. Provision a VPS</h2>
      <p>Spin up an Ubuntu 22.04 or 24.04 server. Note its public IP address.</p>
      <h2>2. Point a domain at it (optional but recommended)</h2>
      <p>
        Create an <code>A record</code> for your domain (e.g. <code>deploy.example.com</code>) and a
        wildcard <code>*.apps.example.com</code> pointing to the server IP. The installer verifies
        DNS before relying on it; if it isn't live yet, you get an <code>http://&lt;IP&gt;</code> fallback URL.
      </p>
      <h2>3. Run the installer</h2>
      <pre>ssh root@your-vps\ncurl -sSL https://deploy.fidscript.com/install.sh | bash</pre>
      <p>
        You'll be asked for: your domain, an admin email, a Cloudflare API token (for DNS + TLS),
        and your server IP (auto-detected where possible). The rest is automated.
      </p>
      <h2>4. First login</h2>
      <p>
        Open the printed URL. On first login you'll set a permanent password, then land on the
        Projects page to create your first project.
      </p>
    `,
  },
  {
    slug: 'deploy-an-app',
    title: 'Deploy an Application',
    category: 'Build',
    icon: Rocket01Icon,
    contentHtml: `
      <h2>Bring a Dockerfile</h2>
      <p>
        FIDScript builds any repository that ships a <code>Dockerfile</code> in its root. Clone or
        point a deployment at your git URL; the worker clones, builds with BuildKit, and runs the
        image on the shared network with automatic TLS via Traefik.
      </p>
      <h2>Via the API</h2>
      <pre>curl -X POST https://deploy.example.com/api/v1/projects/&lt;id&gt;/deployments \\
  -H "Authorization: Bearer &lt;token&gt;" \\
  -H "Content-Type: application/json" \\
  -d '{ "source": { "type": "git", "git": { "url": "https://github.com/you/app.git" } }, "branch": "main" }'</pre>
      <p>
        Watch the state machine move <code>pending → queued → building → success</code> and receive
        a <code>https://&lt;slug&gt;.apps.example.com</code> URL.
      </p>
    `,
  },
  {
    slug: 'edge-functions',
    title: 'Edge Functions',
    category: 'Build',
    icon: CpuIcon,
    contentHtml: `
      <h2>Sandboxed handlers</h2>
      <p>
        Write Node or Python handlers that run in a resource-capped, read-only, no-network
        container. Cold starts are under a second.
      </p>
      <pre>exports.handler = async (event) => ({
  statusCode: 200,
  body: JSON.stringify({ ok: true, echo: event }),
});</pre>
      <h2>Invoke</h2>
      <pre>curl -X POST https://deploy.example.com/api/v1/projects/&lt;id&gt;/functions/&lt;fn&gt;/invoke \\
  -H "Authorization: Bearer &lt;token&gt;" \\
  -d '{ "payload": { "hello": "world" } }'</pre>
    `,
  },
  {
    slug: 'services',
    title: 'Services Overview',
    category: 'Reference',
    icon: Database01Icon,
    contentHtml: `
      <h2>Eleven services, one stack</h2>
      <p>Every project gets access to the full platform surface:</p>
      <ul>
        <li>• <strong>Deployments</strong> — Dockerfile builds, routing, health checks</li>
        <li>• <strong>Databases</strong> — Postgres + PgBouncer per project</li>
        <li>• <strong>Edge Functions</strong> — sandboxed Node/Python</li>
        <li>• <strong>Realtime</strong> — socket.io rooms + Redis adapter</li>
        <li>• <strong>Queues</strong> — NATS JetStream durable queues</li>
        <li>• <strong>Scheduler</strong> — cron that survives restarts</li>
        <li>• <strong>Email</strong> — Stalwart SMTP/JMAP</li>
        <li>• <strong>Storage</strong> — S3-compatible MinIO</li>
        <li>• <strong>Auth</strong> — email/password + magic-code</li>
        <li>• <strong>Domains &amp; TLS</strong> — Cloudflare + Traefik ACME</li>
        <li>• <strong>Monitoring</strong> — metrics, alerts, channels</li>
      </ul>
    `,
  },
  {
    slug: 'configuration',
    title: 'Configuration',
    category: 'Reference',
    icon: Settings01Icon,
    contentHtml: `
      <h2>Where things live</h2>
      <p>
        Installer files: <code>/opt/fidscript</code>. Data volumes: <code>/data/fidscript</code>.
        Secrets are generated into <code>/opt/fidscript/docker/secrets</code> and never committed.
      </p>
      <h2>Updating</h2>
      <pre>cd /opt/fidscript/docker\ngit -C /opt/fidscript-deploy pull\ndocker compose up -d --build</pre>
      <h2>Logs &amp; status</h2>
      <pre>docker compose -f /opt/fidscript/docker/docker-compose.yml logs -f\n/opt/fidscript/scripts/health-check.sh</pre>
    `,
  },
];

export function getDoc(slug: string): Doc | undefined {
  return DOCS.find((d) => d.slug === slug);
}
