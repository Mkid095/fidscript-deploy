import {
  Rocket01Icon,
  ComputerTerminal01Icon,
  CpuIcon,
  Database01Icon,
  BookOpen01Icon,
  Settings01Icon,
  AiBrain01Icon,
  Shield01Icon,
  CloudUploadIcon,
  DatabaseIcon,
  Mail01Icon,
  GlobeIcon,
  Clock03Icon,
  FlashIcon,
  BarChartIcon,
} from '@hugeicons/core-free-icons';

/* ─── Doc type + registry (pure data — no JSX) ───────────────────────────── */

export type Doc = {
  slug: string;
  title: string;
  category: string;
  icon: typeof Rocket01Icon;
  contentHtml: string;
};

const API = 'https://api.deploy.fidscript.com';
const PLATFORM = 'https://deploy.fidscript.com';

export const DOCS: Doc[] = [
  /* ─── Get Started ─────────────────────────────────────────── */
  {
    slug: 'getting-started',
    title: 'Getting Started',
    category: 'Get Started',
    icon: BookOpen01Icon,
    contentHtml: `
<h1>Getting Started with FIDScript</h1>

<p class="lead">FIDScript is a self-hosted developer operating system — the backend platform you'd normally rent from a dozen different SaaS vendors, bundled into one open-source stack that runs entirely on your own VPS.</p>

<h2>What can you build with FIDScript?</h2>

<p>FIDScript gives you production-grade infrastructure primitives that your applications actually need:</p>

<ul>
  <li><strong>Deploy applications</strong> — build any Dockerfile from a Git repository and get automatic HTTPS routing with health checks</li>
  <li><strong>Run databases</strong> — PostgreSQL with connection pooling, automated backups, and point-in-time restore</li>
  <li><strong>Edge functions</strong> — serverless Node.js or Python handlers that cold-start in under a second</li>
  <li><strong>Queues</strong> — durable message queues with at-least-once delivery and dead-letter support</li>
  <li><strong>Cron jobs</strong> — scheduled tasks that survive server restarts and can trigger HTTP endpoints or queue jobs</li>
  <li><strong>Email</strong> — transactional SMTP with your own domain, DKIM signing, and full inbox access via IMAP/JMAP</li>
  <li><strong>Storage</strong> — S3-compatible object storage with signed URLs for private files</li>
  <li><strong>Realtime</strong> — WebSocket channels for live UI updates and presence indicators</li>
  <li><strong>Monitoring</strong> — uptime checks, alert rules, and Pagerduty/Slack notifications</li>
</ul>

<h2>Architecture overview</h2>

<p>The entire platform runs as a Docker Compose stack on a single VPS. Your applications are deployed as additional Docker containers on the same network, so private service-to-service communication never leaves the machine.</p>

<pre><code>Browser → Traefik (reverse proxy + TLS)
         ├── Dashboard (Next.js)
         ├── API (NestJS)
         ├── Postgres + PgBouncer
         ├── Redis
         ├── NATS (event bus)
         ├── MinIO (S3 storage)
         └── Stalwart (SMTP/JMAP mail)</code></pre>

<h2>Prerequisites</h2>

<ul>
  <li><strong>OS:</strong> Ubuntu 22.04 or 24.04 (or Debian 11/12)</li>
  <li><strong>RAM:</strong> 4 GB minimum (8 GB recommended for production)</li>
  <li><strong>Disk:</strong> 20 GB minimum</li>
  <li><strong>Network:</strong> A domain name pointed at the server's IP address</li>
  <li><strong>Cloudflare:</strong> Recommended for DNS management and automatic TLS (free account required)</li>
</ul>

<h2>One-command installation</h2>

<pre><code>ssh root@your-server
curl -sSL https://deploy.fidscript.com/install.sh | bash</code></pre>

<p>The installer will ask for:</p>

<ul>
  <li><strong>Domain name</strong> — your platform domain (e.g. <code>deploy.example.com</code>)</li>
  <li><strong>Admin email</strong> — for Let's Encrypt certificates and platform notifications</li>
  <li><strong>Cloudflare API token</strong> — for automatic DNS and TLS provisioning (optional but recommended)</li>
  <li><strong>Server IP</strong> — auto-detected, confirm or override</li>
</ul>

<p>After installation completes, you'll see your dashboard URL and a temporary admin password. Open the URL, log in, and create your first project.</p>

<h2>Next steps</h2>

<ul>
  <li><a href="/docs/installation">Installation guide</a> — detailed walkthrough of every installation option</li>
  <li><a href="/docs/deploy-an-app">Deploy your first application</a> — connect a Git repository and ship</li>
  <li><a href="/docs/services">Services overview</a> — everything the platform provides</li>
</ul>
`,
  },

  /* ─── Installation ───────────────────────────────────────── */
  {
    slug: 'installation',
    title: 'Installation',
    category: 'Get Started',
    icon: ComputerTerminal01Icon,
    contentHtml: `
<h1>Installation Guide</h1>

<p class="lead">A step-by-step walkthrough of provisioning a VPS, configuring DNS, and running the FIDScript installer.</p>

<h2>Step 1 — Provision a VPS</h2>

<p>Spin up a fresh Ubuntu 22.04 or 24.04 server. Any cloud provider works: Hetzner, DigitalOcean, AWS, Vultr, etc.</p>

<p>Minimum specs:</p>
<ul>
  <li>2 vCPUs</li>
  <li>4 GB RAM</li>
  <li>40 GB disk</li>
</ul>

<p>For production, consider 4+ vCPUs and 8 GB RAM to handle multiple application deployments alongside the platform.</p>

<h2>Step 2 — Configure DNS</h2>

<p>Create the following DNS records pointing to your server's public IP:</p>

<pre><code>A          deploy.example.com     → 203.0.113.42
CNAME      *.apps.example.com    → deploy.example.com
CNAME      api.example.com       → deploy.example.com
MX         example.com           → deploy.example.com   (for mail)</code></pre>

<p>The wildcard CNAME is required so application deployments automatically get their own subdomains without additional DNS configuration.</p>

<h2>Step 3 — Create a Cloudflare API token</h2>

<p>Using Cloudflare is optional but strongly recommended — it enables automatic TLS certificate provisioning and DNS verification.</p>

<ol>
  <li>Log into <a href="https://dash.cloudflare.com" target="_blank">Cloudflare</a></li>
  <li>Go to <strong>My Profile → API Tokens</strong></li>
  <li>Click <strong>Create Token</strong> → <strong>Custom token</strong></li>
  <li>Add the following permissions:
    <ul>
      <li><strong>Zone → Zone → Read</strong></li>
      <li><strong>Zone → DNS → Edit</strong></li>
      <li><strong>Account → Account Settings → Read</strong></li>
    </ul>
  </li>
  <li>Set the zone resource to your domain</li>
  <li>Copy the token — you'll enter it during the installer</li>
</ol>

<h2>Step 4 — Run the installer</h2>

<pre><code>ssh root@your-server
curl -sSL https://deploy.fidscript.com/install.sh | bash</code></pre>

<p>The installer performs these steps automatically:</p>

<ul>
  <li>Detects and validates the OS version</li>
  <li>Installs Docker and Docker Compose (if not present)</li>
  <li>Creates the <code>/opt/fidscript</code> directory structure</li>
  <li>Generates secrets and stores them in <code>/opt/fidscript/docker/secrets</code></li>
  <li>Configures Traefik with Let's Encrypt via DNS-01 challenge (using your Cloudflare token)</li>
  <li>Pulls and starts all platform containers</li>
  <li>Verifies DNS propagation</li>
  <li>Runs a full health check</li>
  <li>Prints your dashboard URL and a temporary admin password</li>
</ul>

<h2>Step 5 — Log in and change your password</h2>

<p>Open the dashboard URL shown at the end of the install. Use the temporary password to log in — you'll be prompted to set a new one immediately.</p>

<h2>Post-installation checklist</h2>

<ul>
  <li>Verify email sending works — try the magic-link login flow</li>
  <li>Check the API health endpoint: <code>curl ${API}/api/v1/health</code></li>
  <li>Create your first project via the dashboard or the API</li>
</ul>

<h2>Uninstallation</h2>

<pre><code>docker compose -f /opt/fidscript/docker/docker-compose.yml down -v
rm -rf /opt/fidscript</code></pre>

<p>The <code>-v</code> flag removes all named volumes (databases, queues, etc.) — this permanently destroys all data. Omit it if you want to keep your data volumes for a future reinstall.</p>
`,
  },

  /* ─── Deploy an App ──────────────────────────────────────── */
  {
    slug: 'deploy-an-app',
    title: 'Deploy an Application',
    category: 'Build',
    icon: Rocket01Icon,
    contentHtml: `
<h1>Deploy an Application</h1>

<p class="lead">Connect a Git repository, push your code, and FIDScript builds a Docker image and deploys it with automatic HTTPS routing — in under two minutes.</p>

<h2>How it works</h2>

<p>FIDScript builds any repository that has a <code>Dockerfile</code> in its root. The build worker:</p>

<ol>
  <li>Clones your Git repository (supports GitHub, GitLab, Bitbucket)</li>
  <li>Runs <code>docker build</code> with BuildKit for fast layer caching</li>
  <li>Pushes the image to the platform's internal registry</li>
  <li>Starts the container on the shared Docker network</li>
  <li>Registers the container with Traefik — HTTPS is enabled automatically</li>
  <li>Runs health checks and reports the deployment URL</li>
</ol>

<h2>Via the dashboard</h2>

<ol>
  <li>Open your project page</li>
  <li>Click <strong>New Deployment</strong></li>
  <li>Enter your Git repository URL (e.g. <code>https://github.com/you/app.git</code>)</li>
  <li>Select the branch to deploy (e.g. <code>main</code>)</li>
  <li>Click <strong>Deploy</strong></li>
</ol>

<p>Watch the build log in real time. When it completes, you'll see your app URL at <code>https://&lt;slug&gt;.apps.&lt;your-domain&gt;</code>.</p>

<h2>Via the API</h2>

<pre><code>curl -X POST ${API}/api/v1/projects/${'<project-id>'}/deployments \\
  -H "Authorization: Bearer ${'<token>'}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "source": {
      "type": "git",
      "git": {
        "url": "https://github.com/you/app.git",
        "branch": "main"
      }
    }
  }'</code></pre>

<p>The response includes a <code>deploymentId</code>. Poll <code>GET /projects/${'<project-id>'}/deployments/${'<deployment-id>'}</code> to track progress.</p>

<h2>Deployment states</h2>

<p>A deployment moves through these states:</p>

<ul>
  <li><strong>pending</strong> — queued for the build worker</li>
  <li><strong>building</strong> — actively running <code>docker build</code></li>
  <li><strong>deploying</strong> — image pushed, container starting</li>
  <li><strong>success</strong> — container healthy, URL assigned</li>
  <li><strong>failed</strong> — build error or health check failure</li>
  <li><strong>stopped</strong> — manually stopped by you</li>
</ul>

<h2>Health checks</h2>

<p>FIDScript expects your container to listen on port 3000. The platform performs an HTTP health check against <code>http://localhost:3000</code> every 10 seconds. If the container returns a non-2xx response 3 times in a row, it's marked unhealthy and restarted.</p>

<p>To disable the default health check, set a custom path:</p>

<pre><code>FIDScript deploy --health-check-path /health</code></pre>

<h2>Environment variables</h2>

<p>Set per-environment variables in your project dashboard under <strong>Settings → Environment Variables</strong>. Variables are injected at container start — no rebuild required.</p>

<h2>Logs</h2>

<pre><code># Stream live build + runtime logs
fidscript deployments logs ${'<deployment-id>'}</code></pre>

<p>Or via the API with SSE streaming:</p>

<pre><code>curl -N ${API}/api/v1/projects/${'<project-id>'}/deployments/${'<deployment-id>'}/logs \\
  -H "Authorization: Bearer ${'<token>'}"</code></pre>
`,
  },

  /* ─── Edge Functions ────────────────────────────────────── */
  {
    slug: 'edge-functions',
    title: 'Edge Functions',
    category: 'Build',
    icon: CpuIcon,
    contentHtml: `
<h1>Edge Functions</h1>

<p class="lead">Write serverless Node.js or Python handlers that run in resource-capped, sandboxed containers with cold starts under a second — no Dockerfile required.</p>

<h2>Creating a function</h2>

<p>A function is a single handler file. FIDScript handles packaging and scaling automatically.</p>

<h3>Node.js</h3>

<pre><code>// index.js
export async function handler(event) {
  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: 'Hello from the edge',
      timestamp: new Date().toISOString(),
    }),
  };
}</code></pre>

<h3>Python</h3>

<pre><code># handler.py
def handle(event):
    return {
        "statusCode": 200,
        "body": f"Hello, {event.get('query', {}).get('name', 'World')}",
    }</code></pre>

<h2>Deploy via API</h2>

<pre><code>curl -X POST ${API}/api/v1/projects/${'<project-id>'}/functions \\
  -H "Authorization: Bearer ${'<token>'}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "name": "hello",
    "runtime": "nodejs20",
    "env": {}
  }'</code></pre>

<p>Upload code:</p>

<pre><code>curl -X POST ${API}/api/v1/projects/${'<project-id>'}/functions/${'<function-id>'}/code \\
  -H "Authorization: Bearer ${'<token>'}" \\
  -F "file=@handler.js"</code></pre>

<h2>Invocation</h2>

<pre><code>curl -X POST ${API}/api/v1/projects/${'<project-id>'}/functions/${'<function-id>'}/invoke \\
  -H "Authorization: Bearer ${'<token>'}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "payload": { "name": "Alice" }
  }'</code></pre>

<h2>Secrets in functions</h2>

<p>Access environment variables set in <strong>Settings → Environment Variables</strong> just like in regular applications — <code>process.env.DATABASE_URL</code> in Node.js or <code>os.environ['DATABASE_URL']</code> in Python.</p>

<h2>Resource limits</h2>

<ul>
  <li><strong>Memory:</strong> 128 MB default, configurable up to 512 MB</li>
  <li><strong>Timeout:</strong> 30 seconds default, max 300 seconds</li>
  <li><strong>Concurrency:</strong> auto-scales based on request rate</li>
</ul>
`,
  },

  /* ─── Databases ──────────────────────────────────────────── */
  {
    slug: 'databases',
    title: 'Databases',
    category: 'Build',
    icon: Database01Icon,
    contentHtml: `
<h1>Databases</h1>

<p class="lead">Every project gets a dedicated PostgreSQL database with connection pooling, automated daily backups, and point-in-time restore capability.</p>

<h2>Creating a database</h2>

<pre><code># Via CLI
fidscript databases create my-app-db --project ${'<project-id>'}

# Via API
curl -X POST ${API}/api/v1/projects/${'<project-id>'}/databases \\
  -H "Authorization: Bearer ${'<token>'}" \\
  -d '{ "name": "my-app-db" }'</code></pre>

<h2>Connection details</h2>

<pre><code>curl ${API}/api/v1/projects/${'<project-id>'}/databases/${'<database-id>'} \\
  -H "Authorization: Bearer ${'<token>'}"</code></pre>

<p>Returns:</p>

<pre><code>{
  "id": "db_abc123",
  "name": "my-app-db",
  "connectionString": "postgresql://user:pass@pgbouncer:5432/my_app_db",
  "host": "pgbouncer",
  "port": 5432,
  "database": "my_app_db",
  "user": "user",
  "poolMode": "transaction"
}</code></pre>

<p>All applications connect to the <strong>PgBouncer endpoint</strong> (port 5432), not directly to Postgres — this keeps connection count low even with serverless-style workloads.</p>

<h2>Backups</h2>

<p>Daily automated backups run at 02:00 UTC. Backups are retained for 30 days. You can also trigger a manual backup:</p>

<pre><code>curl -X POST ${API}/api/v1/projects/${'<project-id>'}/databases/${'<database-id>'}/backups \\
  -H "Authorization: Bearer ${'<token>'}"</code></pre>

<h2>Point-in-time restore</h2>

<pre><code>curl -X POST ${API}/api/v1/projects/${'<project-id>'}/databases/${'<database-id>'}/restore \\
  -H "Authorization: Bearer ${'<token>'}" \\
  -d '{ "backupId": "bkp_xyz789", "targetName": "my-app-db-restored" }'</code></pre>

<p>This creates a <em>new</em> database with the restored data — the original is untouched.</p>

<h2>Connecting from applications</h2>

<pre><code># Node.js / Prisma
DATABASE_URL="postgresql://user:pass@pgbouncer:5432/my_app_db"

# Python / SQLAlchemy
engine = create_engine("postgresql+psycopg2://user:pass@pgbouncer:5432/my_app_db")</code></pre>

<p>The connection string is the same for all applications in the project — PgBouncer handles routing to the correct per-project Postgres instance transparently.</p>
`,
  },

  /* ─── Queues ─────────────────────────────────────────────── */
  {
    slug: 'queues',
    title: 'Queues',
    category: 'Build',
    icon: FlashIcon,
    contentHtml: `
<h1>Queues</h1>

<p class="lead">Durable message queues with at-least-once delivery, automatic retries, dead-letter queues, and a simple HTTP API for publishing and consuming.</p>

<h2>Concepts</h2>

<ul>
  <li><strong>Queue</strong> — a named, durable stream of messages</li>
  <li><strong>Message</strong> — a JSON payload published to a queue</li>
  <li><strong>Consumer</strong> — pulls messages from a queue and processes them</li>
  <li><strong>Dead-letter queue</strong> — messages that fail processing are routed here after max retries</li>
</ul>

<h2>Create a queue</h2>

<pre><code>curl -X POST ${API}/api/v1/projects/${'<project-id>'}/queues \\
  -H "Authorization: Bearer ${'<token>'}" \\
  -d '{
    "name": "email-jobs",
    "type": "work",
    "retries": 3,
    "deadLetter": "email-jobs-dlq"
  }'</code></pre>

<h2>Publish a message</h2>

<pre><code>curl -X POST ${API}/api/v1/projects/${'<project-id>'}/queues/${'<queue-id>'}/messages \\
  -H "Authorization: Bearer ${'<token>'}" \\
  -d '{
    "payload": {
      "to": "user@example.com",
      "subject": "Welcome to FIDScript",
      "template": "welcome"
    }
  }'</code></pre>

<h2>Consume messages</h2>

<pre><code>curl -X POST ${API}/api/v1/projects/${'<project-id>'}/queues/${'<queue-id>'}/consume \\
  -H "Authorization: Bearer ${'<token>'}" \\
  -d '{ "maxMessages": 10, "timeout": 30000 }'</code></pre>

<p>Returns up to <code>maxMessages</code> messages. Your consumer must explicitly acknowledge each message after successful processing — if not acknowledged within the visibility timeout, the message becomes visible again for another consumer to pick up.</p>

<pre><code># Acknowledge
curl -X POST ${API}/api/v1/projects/${'<project-id>'}/queues/${'<queue-id>'}/ack \\
  -H "Authorization: Bearer ${'<token>'}" \\
  -d '{ "messageIds": ["msg_abc123"] }'</code></pre>

<h2>Example: background email processor</h2>

<pre><code>async function processEmailJobs(queueId, api, token) {
  while (true) {
    const { messages } = await fetch(\`\${api}/queues/\${queueId}/consume\`, {
      method: 'POST',
      headers: { Authorization: \`Bearer \${token}\` },
      body: JSON.stringify({ maxMessages: 5, timeout: 30000 }),
    });

    for (const msg of messages) {
      try {
        await sendEmail(msg.payload);
        await fetch(\`\${api}/queues/\${queueId}/ack\`, {
          method: 'POST',
          headers: { Authorization: \`Bearer \${token}\`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ messageIds: [msg.id] }),
        });
      } catch (err) {
        console.error('Failed to process message', msg.id, err);
        // Message returns to queue automatically on nack or timeout
      }
    }
  }
}</code></pre>
`,
  },

  /* ─── Scheduler ──────────────────────────────────────────── */
  {
    slug: 'scheduler',
    title: 'Scheduler',
    category: 'Build',
    icon: Clock03Icon,
    contentHtml: `
<h1>Scheduler</h1>

<p class="lead">Cron jobs that survive server restarts and can trigger HTTP endpoints, publish to queues, or invoke edge functions — all with a full run history.</p>

<h2>Cron expression format</h2>

<p>FIDScript uses standard 5-field cron syntax (UTC timezone):</p>

<pre><code>┌───────────── minute     (0–59)
│ ┌─────────── hour       (0–23)
│ │ ┌───────── day        (1–31)
│ │ │ ┌─────── month      (1–12)
│ │ │ │ ┌───── day of week (0–6, Sunday=0)
│ │ │ │ │
* * * * *</code></pre>

<p>Examples:</p>

<ul>
  <li><code>0 9 * * *</code> — every day at 09:00 UTC</li>
  <li><code>*/15 * * * *</code> — every 15 minutes</li>
  <li><code>0 2 * * 1-5</code> — weekdays at 02:00 UTC</li>
  <li><code>30 4 1 * *</code> — first day of every month at 04:30 UTC</li>
</ul>

<h2>Create a cron job</h2>

<pre><code>curl -X POST ${API}/api/v1/projects/${'<project-id>'}/cron \\
  -H "Authorization: Bearer ${'<token>'}" \\
  -d '{
    "name": "daily-database-backup",
    "schedule": "0 2 * * *",
    "action": {
      "type": "http",
      "endpoint": "https://internal-backup-service.example.com/backup",
      "method": "POST",
      "headers": { "Authorization": "Bearer internal-secret" }
    }
  }'</code></pre>

<h2>Cron job actions</h2>

<h3>HTTP endpoint</h3>
<pre><code>{
  "type": "http",
  "endpoint": "https://api.example.com/cron",
  "method": "POST",
  "headers": { "X-Cron-Secret": "token" }
}</code></pre>

<h3>Queue publish</h3>
<pre><code>{
  "type": "queue",
  "queueId": "queue_abc123",
  "payload": { "job": "cleanup", "cutoff": "2024-01-01" }
}</code></pre>

<h3>Edge function</h3>
<pre><code>{
  "type": "function",
  "functionId": "fn_xyz789",
  "payload": { "operation": "cleanup" }
}</code></pre>

<h2>Manual trigger</h2>

<pre><code>curl -X POST ${API}/api/v1/projects/${'<project-id}'}/cron/${'<cron-id>'}/trigger \\
  -H "Authorization: Bearer ${'<token}'}"</code></pre>

<h2>View run history</h2>

<pre><code>curl ${API}/api/v1/projects/${'<project-id>'}/cron/${'<cron-id>'}/runs \\
  -H "Authorization: Bearer ${'<token}'}"</code></pre>
`,
  },

  /* ─── Email ──────────────────────────────────────────────── */
  {
    slug: 'email',
    title: 'Email',
    category: 'Build',
    icon: Mail01Icon,
    contentHtml: `
<h1>Email</h1>

<p class="lead">Transactional email powered by Stalwart SMTP. Send from your own domain with full DKIM, SPF, and DMARC compliance — and access inboxes via IMAP/JMAP.</p>

<h2>Connect your domain</h2>

<p>Before sending, you need to verify ownership of your domain and configure DNS records.</p>

<ol>
  <li>Go to <strong>Email → Domains → Add Domain</strong></li>
  <li>Enter your domain (e.g. <code>example.com</code>)</li>
  <li>Add the DNS records shown (MX, TXT, DKIM)</li>
  <li>Click <strong>Verify</strong> — FIDScript checks DNS propagation</li>
</ol>

<h2>DNS records to add</h2>

<pre><code># MX — mail delivery
MX   example.com    mail.example.com    (priority 10)

# SPF — authorize the platform to send mail
TXT  example.com    "v=spf1 include:mail.example.com ~all"

# DKIM — email authenticity (value shown after domain is added)
TXT  default._domainkey.example.com    "v=DKIM1; k=ed25519; p=..."

# DMARC — alignment policy
TXT  _dmarc.example.com    "v=DMARC1; p=quarantine; rua=mailto:dmarc@example.com"</code></pre>

<h2>Send an email</h2>

<pre><code>curl -X POST ${API}/api/v1/projects/${'<project-id>'}/email/send \\
  -H "Authorization: Bearer ${'<token>'}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "from": "app@example.com",
    "to": ["user@example.com"],
    "subject": "Your order has shipped",
    "text": "Order #12345 has been dispatched and is on its way.",
    "html": "<p>Order #12345 has been dispatched...</p>"
  }'</code></pre>

<h2>Send a templated email</h2>

<pre><code># First create a template in the dashboard or via API
curl -X POST ${API}/api/v1/projects/${'<project-id>'}/email/templates \\
  -H "Authorization: Bearer ${'<token}'}" \\
  -d '{
    "name": "welcome",
    "subject": "Welcome to {{ .company }}",
    "text": "Hi {{ .name }},
Welcome aboard!",
    "html": "<p>Hi {{ .name }},<br/>Welcome aboard!</p>"
  }'

# Send using the template
curl -X POST ${API}/api/v1/projects/${'<project-id}'}/email/send-template \\
  -H "Authorization: Bearer ${'<token}'}" \\
  -d '{
    "templateId": "tmpl_abc123",
    "to": ["user@example.com"],
    "variables": { "name": "Alice", "company": "Acme Corp" }
  }'</code></pre>

<h2>Webhook for inbound mail</h2>

<p>Configure a webhook URL under <strong>Email → Domain → Catch-all</strong> to receive inbound mail as JSON POST requests:</p>

<pre><code>{
  "from": "customer@example.com",
  "to": "orders@example.com",
  "subject": "Order inquiry",
  "text": "...",
  "timestamp": "2024-01-15T10:30:00Z"
}</code></pre>
`,
  },

  /* ─── Storage ────────────────────────────────────────────── */
  {
    slug: 'storage',
    title: 'Storage',
    category: 'Build',
    icon: CloudUploadIcon,
    contentHtml: `
<h1>Storage</h1>

<p class="lead">S3-compatible object storage for any file type — user uploads, application assets, backup archives, and more. Generates signed URLs for private files.</p>

<h2>Create a bucket</h2>

<pre><code>curl -X POST ${API}/api/v1/projects/${'<project-id>'}/storage/buckets \\
  -H "Authorization: Bearer ${'<token>'}" \\
  -d '{ "name": "user-uploads", "public": false }'</code></pre>

<p>Set <code>"public": true</code> for publicly accessible files (no signed URL needed).</p>

<h2>Upload a file</h2>

<pre><code>curl -X POST ${API}/api/v1/projects/${'<project-id>'}/storage/buckets/${'<bucket-id>'}/files \\
  -H "Authorization: Bearer ${'<token>'}" \\
  -F "file=@./image.png" \\
  -F "key=uploads/2024/image.png"</code></pre>

<h2>Download a file</h2>

<pre><code>curl ${API}/api/v1/projects/${'<project-id>'}/storage/buckets/${'<bucket-id>'}/files/${'<file-id>'} \\
  -H "Authorization: Bearer ${'<token>'}" \\
  -o downloaded-image.png</code></pre>

<h2>Signed URLs for private files</h2>

<pre><code>curl -X POST ${API}/api/v1/projects/${'<project-id}'}/storage/buckets/${'<bucket-id>'}/files/${'<file-id>'}/signed-url \\
  -H "Authorization: Bearer ${'<token}'}" \\
  -d '{ "expiresIn": 3600 }'</code></pre>

<p>Returns a temporary URL valid for 1 hour (default max: 24 hours). Share this URL with clients — no auth headers required.</p>

<h2>SDK example</h2>

<pre><code>import { FidscriptClient } from '@fidscript-deploy/sdk';

const sdk = new FidscriptClient({ apiKey, apiBase: '${API}' });

// Upload
await sdk.storage.uploadFile(projectId, bucketId, 'uploads/avatar.png', fileBuffer);

// Get signed URL (private bucket)
const { url } = await sdk.storage.getSignedUrl(projectId, bucketId, fileId, 3600);

// Download
const file = await sdk.storage.getFile(projectId, bucketId, fileId);</code></pre>
`,
  },

  /* ─── Domains & TLS ─────────────────────────────────────── */
  {
    slug: 'domains',
    title: 'Domains & TLS',
    category: 'Build',
    icon: GlobeIcon,
    contentHtml: `
<h1>Domains & TLS</h1>

<p class="lead">Connect custom domains to your projects with automatic TLS certificate provisioning via Let's Encrypt and Cloudflare DNS. Every domain gets a free certificate — no manual renewal ever.</p>

<h2>Add a domain to a project</h2>

<pre><code>curl -X POST ${API}/api/v1/projects/${'<project-id>'}/domains \\
  -H "Authorization: Bearer ${'<token>'}" \\
  -d '{ "domain": "app.example.com" }'</code></pre>

<p>FIDScript automatically creates the required DNS records in your Cloudflare zone (if connected) and provisions the TLS certificate. The process takes 30–60 seconds.</p>

<h2>Domain verification</h2>

<p>If DNS isn't set up yet, you can manually add the TXT verification record to your DNS provider:</p>

<pre><code>TXT  _fidscript-challenge.app.example.com    "verification-token-here"</code></pre>

<p>Click <strong>Verify</strong> in the dashboard once the record is propagated (typically 1–5 minutes).</p>

<h2>SSL/TLS modes</h2>

<ul>
  <li><strong>Full (strict)</strong> — HTTPS only, verify upstream certificates. Recommended for production.</li>
  <li><strong>Flexible</strong> — HTTPS on the outside, HTTP on the inside. Only use for testing without a certificate on the upstream.</li>
  <li><strong>Off</strong> — No encryption. Not recommended.</li>
</ul>

<h2>HSTS settings</h2>

<p>Enable HSTS to enforce HTTPS for all subdomains:</p>

<pre><code>curl -X PUT ${API}/api/v1/projects/${'<project-id}'}/domains/${'<domain-id>'}/tls \\
  -H "Authorization: Bearer ${'<token>'}" \\
  -d '{ "hsts": true, "hstsMaxAge": 31536000 }'</code></pre>
`,
  },

  /* ─── Monitoring ────────────────────────────────────────── */
  {
    slug: 'monitoring',
    title: 'Monitoring',
    category: 'Operations',
    icon: BarChartIcon,
    contentHtml: `
<h1>Monitoring</h1>

<p class="lead">Uptime checks, alert rules, dashboards, and notification channels — get paged when something breaks and track your infrastructure health over time.</p>

<h2>Alert rules</h2>

<p>Create rules that evaluate on a schedule and fire when conditions are met:</p>

<pre><code>curl -X POST ${API}/api/v1/projects/${'<project-id>'}/monitoring/alerts \\
  -H "Authorization: Bearer ${'<token>'}" \\
  -d '{
    "name": "High CPU alert",
    "metric": "cpu_usage",
    "condition": "above",
    "threshold": 80,
    "for": "5m",
    "severity": "warning"
  }'</code></pre>

<h2>Notification channels</h2>

<pre><code># Slack webhook
curl -X POST ${API}/api/v1/projects/${'<project-id}'}/monitoring/channels \\
  -H "Authorization: Bearer ${'<token}'}" \\
  -d '{
    "type": "slack",
    "name": " engineering-alerts",
    "url": "https://hooks.slack.com/services/XXX/YYY/ZZZ"
  }'

# Pagerduty
curl -X POST ${API}/api/v1/projects/${'<project-id}'}/monitoring/channels \\
  -H "Authorization: Bearer ${'<token}'}" \\
  -d '{
    "type": "pagerduty",
    "name": " on-call",
    "routingKey": "your-pagerduty-integration-key"
  }'

# Email
curl -X POST ${API}/api/v1/projects/${'<project-id}'}/monitoring/channels \\
  -H "Authorization: Bearer ${'<token}'}" \\
  -d '{
    "type": "email",
    "name": " ops-team",
    "addresses": ["ops@example.com"]
  }'</code></pre>

<h2>Uptime checks</h2>

<pre><code>curl -X POST ${API}/api/v1/projects/${'<project-id}'}/monitoring/uptime \\
  -H "Authorization: Bearer ${'<token}'}" \\
  -d '{
    "name": "API availability",
    "url": "https://api.example.com/health",
    "interval": "1m"
  }'</code></pre>

<h2>View active alerts</h2>

<pre><code>curl ${API}/api/v1/projects/${'<project-id}'}/monitoring/alerts/active \\
  -H "Authorization: Bearer ${'<token}'}"</code></pre>
`,
  },

  /* ─── AI & MCP ──────────────────────────────────────────── */
  {
    slug: 'ai-mcp',
    title: 'AI & MCP',
    category: 'Reference',
    icon: AiBrain01Icon,
    contentHtml: `
<h1>AI & MCP</h1>

<p class="lead">Connect FIDScript to AI agents like Claude Desktop or Cursor via the Model Context Protocol. Your agent gets 100+ tools to manage the entire platform through natural language.</p>

<h2>Quick setup</h2>

<h3>1. Install the CLI</h3>
<pre><code>npm install -g @fidscript-deploy/cli</code></pre>

<h3>2. Install the MCP server</h3>
<pre><code>npm install -g @fidscript-deploy/mcp-server</code></pre>

<h3>3. Generate an API key</h3>
<p>Open <a href="${PLATFORM}/projects">your projects dashboard</a>, select a project, then go to <strong>MCP</strong>. Click <strong>Generate API Key</strong> and copy the key.</p>

<h3>4. Configure Claude Desktop</h3>
<p>Add to <code>~/.claude/settings.json</code>:</p>
<pre><code>{
  "mcpServers": {
    "fidscript": {
      "command": "fidscript-mcp",
      "env": {
        "FIDSCRIPT_API_KEY": "${'<your-api-key>'}",
        "FIDSCRIPT_API_URL": "${API}"
      }
    }
  }
}</code></pre>

<h3>5. Restart Claude Desktop</h3>

<p>After saving the config, quit and reopen Claude Desktop. The FIDScript tools will appear in the tools panel.</p>

<h2>What your agent can do</h2>

<h3>Projects</h3>
<ul>
  <li><code>project_list</code> — list all accessible projects</li>
  <li><code>project_create</code> — create a new project</li>
  <li><code>project_get</code> — get project details and status</li>
</ul>

<h3>Deployments</h3>
<ul>
  <li><code>deployments_list</code> — list deployments across a project</li>
  <li><code>deployments_create</code> — trigger a deployment from a Git branch</li>
  <li><code>deployments_getLogs</code> — stream build and runtime logs</li>
  <li><code>deployments_restart</code> — restart a running deployment</li>
  <li><code>deployments_rollback</code> — rollback to a previous version</li>
</ul>

<h3>Databases</h3>
<ul>
  <li><code>databases_create</code> — provision a new PostgreSQL database</li>
  <li><code>databases_backup</code> — trigger a manual backup</li>
  <li><code>databases_restore</code> — restore from a backup</li>
</ul>

<h3>Functions</h3>
<ul>
  <li><code>functions_create</code> — deploy a new edge function</li>
  <li><code>functions_invoke</code> — test a function with a payload</li>
</ul>

<h3>Email</h3>
<ul>
  <li><code>email_send</code> — send a transactional email</li>
  <li><code>email_status</code> — check domain verification</li>
</ul>

<h3>And 90+ more tools</h3>
<p>Covering queues, cron, storage, monitoring, logging, domains, and more.</p>

<h2>Example agent session</h2>

<pre><code>User: Deploy my main branch to production
Agent: → deployments_create({ project_id: "proj_abc", branch: "main" })
       → Watches build progress via deployments_getLogs
       → Confirms success: "Deployed to https://myapp.apps.example.com"

User: Create a new database for the checkout service
Agent: → databases_create({ project_id: "proj_abc", name: "checkout-db" })
       → Returns connection string: "postgresql://user:pass@pgbouncer..."

User: Set up a cron job to backup the database every day at 2am
Agent: → cron_create({
         project_id: "proj_abc",
         name: "daily-backup",
         schedule: "0 2 * * *",
         action: { type: "queue", queue_id: "queue_backup", payload: { db: "checkout-db" } }
       })</code></pre>
`,
  },

  /* ─── Configuration ──────────────────────────────────────── */
  {
    slug: 'configuration',
    title: 'Configuration',
    category: 'Reference',
    icon: Settings01Icon,
    contentHtml: `
<h1>Configuration Reference</h1>

<p class="lead">Where FIDScript stores its files, how to update the platform, and how to manage secrets and environment variables.</p>

<h2>File locations</h2>

<ul>
  <li><code>/opt/fidscript</code> — installation root
    <ul>
      <li><code>docker/</code> — docker-compose.yml and secrets</li>
      <li><code>scripts/</code> — health-check.sh, backup.sh, etc.</li>
    </ul>
  </li>
  <li><code>/var/lib/docker/volumes/</code> — persistent data volumes (databases, queues, storage)</li>
</ul>

<h2>Environment variables for the API</h2>

<p>The API reads configuration from environment variables set in <code>/opt/fidscript/docker/.env</code> or via Docker secrets.</p>

<pre><code># Required
DATABASE_URL=postgresql://fidscript:password@postgres:5432/fidscript
JWT_SECRET=...                    # 32+ character random string
REDIS_URL=redis://:password@redis:6379
NATS_URL=nats://nats:4222

# Optional
CORS_ORIGIN=https://deploy.example.com   # comma-separated list
LOG_LEVEL=info

# Email (Stalwart)
STALWART_JMAP_URL=http://stalwart:8080/
SMTP_FROM=admin@example.com</code></pre>

<h2>Updating the platform</h2>

<pre><code>cd /opt/fidscript/docker
git -C /opt/fidscript-deploy pull
docker compose pull
docker compose up -d --build</code></pre>

<h2>Viewing logs</h2>

<pre><code># All services
docker compose -f /opt/fidscript/docker/docker-compose.yml logs -f

# Just the API
docker compose -f /opt/fidscript/docker/docker-compose.yml logs -f api

# Last 100 lines of a specific service
docker compose -f /opt/fidscript/docker/docker-compose.yml logs --tail=100 api</code></pre>

<h2>Health check</h2>

<pre><code>/opt/fidscript/scripts/health-check.sh</code></pre>

<p>Returns exit code 0 if all services are healthy, non-zero otherwise. Run this in a cron job or monitoring probe.</p>
`,
  },

  /* ─── Security ──────────────────────────────────────────── */
  {
    slug: 'security',
    title: 'Security',
    category: 'Reference',
    icon: Shield01Icon,
    contentHtml: `
<h1>Security</h1>

<p class="lead">How FIDScript handles secrets, authentication, network isolation, and tenant separation — and what you should do to keep your deployment secure.</p>

<h2>Secrets management</h2>

<p>All platform secrets are generated at install time and stored in <code>/opt/fidscript/docker/secrets/</code> as files (not environment variables). They're mounted into containers at runtime.</p>

<p>Never commit <code>secrets/</code> to version control. The directory is gitignored by the installer.</p>

<h2>API keys</h2>

<p>Project-level API keys (<code>fpk_...</code>) are scoped to a single project and can be regenerated from the dashboard. Each key has full access to that project's resources.</p>

<p>API keys are stored as bcrypt hashes — the plaintext is only shown once at creation time.</p>

<h2>Network isolation</h2>

<ul>
  <li>All containers run on a Docker bridge network — no container is directly exposed to the internet except via Traefik</li>
  <li>Application containers connect to the platform network via Traefik's ingress routing — they cannot bypass the load balancer</li>
  <li>Database ports (5432, 6379, 4222) are bound to the Docker internal interface only — they are never reachable from outside the host</li>
</ul>

<h2>Tenant isolation</h2>

<p>In a multi-tenant FIDScript deployment, each project is fully isolated. Projects cannot access each other's databases, storage buckets, queues, or secrets. The platform API enforces project membership before any resource operation.</p>

<h2>TLS certificates</h2>

<p>All TLS certificates are provisioned via Let's Encrypt ACME DNS-01 challenge using your Cloudflare API token. Certificates are stored in Traefik's certificate store and automatically renewed 30 days before expiry.</p>

<h2>Dependency updates</h2>

<p>Keep the platform updated to receive security patches. The <code>docker compose pull</code> step fetches the latest images with security fixes:</p>

<pre><code>cd /opt/fidscript/docker && docker compose up -d --build</code></pre>

<p>Watch the release notes at <a href="https://github.com/Mkid095/fidscript-deploy" target="_blank">github.com/Mkid095/fidscript-deploy</a> for security announcements.</p>
`,
  },

  /* ─── Services Overview ───────────────────────────────────── */
  {
    slug: 'services',
    title: 'Services Overview',
    category: 'Reference',
    icon: Database01Icon,
    contentHtml: `
<h1>Services Overview</h1>

<p class="lead">Every project on FIDScript gets access to these production-grade backend services — provisioned, scaled, and operated entirely from the dashboard, CLI, or MCP.</p>

<h2>Platform services</h2>

<table>
  <thead><tr><th>Service</th><th>Technology</th><th>Use for</th></tr></thead>
  <tbody>
    <tr><td><strong>Deployments</strong></td><td>Docker, BuildKit, Traefik</td><td>Any Dockerfile-based app from Git</td></tr>
    <tr><td><strong>Databases</strong></td><td>PostgreSQL 16, PgBouncer</td><td>Relational data with connection pooling</td></tr>
    <tr><td><strong>Edge Functions</strong></td><td>Node.js 20, Python 3.12</td><td>Serverless request/response handlers</td></tr>
    <tr><td><strong>Storage</strong></td><td>MinIO (S3-compatible)</td><td>Files, backups, user uploads</td></tr>
    <tr><td><strong>Queues</strong></td><td>NATS JetStream</td><td>Async job processing, webhooks</td></tr>
    <tr><td><strong>Scheduler</strong></td><td>Cron (systemd-based)</td><td>Recurring tasks, scheduled jobs</td></tr>
    <tr><td><strong>Email</strong></td><td>Stalwart SMTP/JMAP</td><td>Transactional mail, inbound processing</td></tr>
    <tr><td><strong>Realtime</strong></td><td>Socket.IO, Redis adapter</td><td>Live UI updates, presence</td></tr>
    <tr><td><strong>Monitoring</strong></td><td>Prometheus, Alertmanager</td><td>Uptime, alerts, Pagerduty/Slack</td></tr>
    <tr><td><strong>Logging</strong></td><td>Loki, Grafana</td><td>Log aggregation and querying</td></tr>
    <tr><td><strong>Domains & TLS</strong></td><td>Cloudflare, Traefik</td><td>Custom domains, automatic HTTPS</td></tr>
    <tr><td><strong>Auth</strong></td><td>JWT, magic codes</td><td>User accounts, session management</td></tr>
  </tbody>
</table>

<h2>What you manage</h2>

<ul>
  <li>Your application code — FIDScript builds and runs it</li>
  <li>Environment variables — set per-project in the dashboard</li>
  <li>Database schema — your app runs migrations</li>
  <li>Domain DNS — you configure records (or let Cloudflare do it)</li>
</ul>

<h2>What FIDScript manages</h2>

<ul>
  <li>SSL/TLS certificate renewal</li>
  <li>Daily automated database backups</li>
  <li>Container health checks and restarts</li>
  <li>Queue consumer availability and retries</li>
  <li>Cron schedule execution</li>
  <li>Storage bucket durability and signed URLs</li>
</ul>

<h2>Usage limits</h2>

<p>Limits are configurable per-project by the platform admin. Default soft limits (with hard caps):</p>

<ul>
  <li><strong>Deployments per project:</strong> 10 (50)</li>
  <li><strong>Databases per project:</strong> 5 (20)</li>
  <li><strong>Edge function invocations/month:</strong> 100,000 (1,000,000)</li>
  <li><strong>Storage per project:</strong> 10 GB (100 GB)</li>
  <li><strong>Email sending (daily):</strong> 1,000 (50,000)</li>
</ul>
`,
  },
];

export function getDoc(slug: string): Doc | undefined {
  return DOCS.find((d) => d.slug === slug);
}
