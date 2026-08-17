import {
  Rocket01Icon, ComputerTerminal01Icon, CpuIcon, Database01Icon, BookOpen01Icon, Settings01Icon,
  AiBrain01Icon,
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
  {
    slug: 'ai-mcp',
    title: 'AI & MCP',
    category: 'Reference',
    icon: AiBrain01Icon,
    contentHtml: `
      <h2>AI Agents + MCP</h2>
      <p>
        Connect FIDScript to AI agents like Claude Desktop or Cursor via the Model Context Protocol.
        The MCP server exposes 100+ platform tools — create deployments, manage databases,
        send emails, inspect queues, and more, all through natural language.
      </p>

      <h2>Quick Setup</h2>
      <pre>npm install -g @fidscript-deploy/mcp-server</pre>
      <p>Generate an API key at <a href="/mcp">deploy.fidscript.com/mcp</a>, then add to your AI client config.</p>

      <h2>Claude Desktop</h2>
      <p>Add to <code>~/.claude/settings.json</code>:</p>
      <pre>{
  "mcpServers": {
    "fidscript": {
      "command": "fidscript-mcp",
      "env": {
        "FIDSCRIPT_API_KEY": "fpk_xxx",
        "FIDSCRIPT_API_URL": "https://deploy.fidscript.com/api/v1"
      }
    }
  }
}</pre>

      <h2>Cursor</h2>
      <p>Settings → AI → MCP Servers → Add (same JSON config as above).</p>

      <h2>CLI</h2>
      <pre>npm install -g @fidscript-deploy/cli
fidscript login &lt;your-api-key&gt;
fidscript --help</pre>

      <h2>Available MCP Tools</h2>
      <p>100+ tools across 15 categories:</p>

      <h3>Projects</h3>
      <p><code>project_list</code> · <code>project_create</code></p>

      <h3>Deployments</h3>
      <p><code>deployments_list</code> · <code>deployments_get</code> · <code>deployments_getLogs</code> · <code>deployments_create</code> · <code>deployments_stop</code> · <code>deployments_restart</code> · <code>deployments_rollback</code> · <code>deployments_destroy</code></p>

      <h3>Functions</h3>
      <p><code>functions_list</code> · <code>functions_get</code> · <code>functions_create</code> · <code>functions_deploy</code> · <code>functions_update</code> · <code>functions_delete</code> · <code>functions_invoke</code></p>

      <h3>Databases</h3>
      <p><code>databases_list</code> · <code>databases_get</code> · <code>databases_create</code> · <code>databases_delete</code> · <code>databases_backup</code> · <code>databases_listBackups</code> · <code>databases_restore</code></p>

      <h3>Storage</h3>
      <p><code>storage_listBuckets</code> · <code>storage_createBucket</code> · <code>storage_deleteBucket</code> · <code>storage_listFiles</code> · <code>storage_uploadFile</code> · <code>storage_deleteFile</code> · <code>storage_getSignedUrl</code></p>

      <h3>Queues</h3>
      <p><code>queues_list</code> · <code>queues_get</code> · <code>queues_create</code> · <code>queues_delete</code> · <code>queues_publish</code> · <code>queues_getMessages</code></p>

      <h3>Scheduler</h3>
      <p><code>cron_list</code> · <code>cron_get</code> · <code>cron_create</code> · <code>cron_update</code> · <code>cron_delete</code> · <code>cron_trigger</code> · <code>cron_getNextRun</code></p>

      <h3>Email</h3>
      <p><code>email_status</code> · <code>email_domains</code> · <code>email_send</code> · <code>email_send_template</code> · <code>email_templates</code> · <code>email_inbox</code> · <code>email_analytics</code> · <code>email_suppressions</code></p>

      <h3>Domains</h3>
      <p><code>domain_list</code> · <code>domain_add</code> · <code>domain_verify</code></p>

      <h3>Realtime</h3>
      <p><code>realtime_listChannels</code> · <code>realtime_createChannel</code> · <code>realtime_deleteChannel</code> · <code>realtime_setPresence</code></p>

      <h3>Monitoring</h3>
      <p><code>monitoring_getActiveAlerts</code> · <code>monitoring_listAlertRules</code> · <code>monitoring_getAlertRule</code> · <code>monitoring_createAlertRule</code> · <code>monitoring_updateAlertRule</code> · <code>monitoring_deleteAlertRule</code> · <code>monitoring_acknowledgeAlert</code> · <code>monitoring_resolveAlert</code> · <code>monitoring_getMetrics</code> · <code>monitoring_getMetricSeries</code> · <code>monitoring_getMetricsStats</code> · <code>monitoring_listDashboards</code> · <code>monitoring_createDashboard</code> · <code>monitoring_getUptime</code> · <code>monitoring_listNotificationChannels</code> · <code>monitoring_createNotificationChannel</code> · <code>monitoring_getNotificationChannel</code> · <code>monitoring_updateNotificationChannel</code> · <code>monitoring_deleteNotificationChannel</code> · <code>monitoring_testNotificationChannel</code> · <code>monitoring_listIntegrationConfigs</code> · <code>monitoring_updateIntegrationConfig</code> · <code>monitoring_getIncident</code> · <code>monitoring_recordMetric</code></p>

      <h3>Logging</h3>
      <p><code>logging_listLogStreams</code> · <code>logging_getLogStream</code> · <code>logging_createLogStream</code> · <code>logging_deleteLogStream</code> · <code>logging_getLogEvents</code> · <code>logging_queryLogs</code> · <code>logging_tailLogs</code> · <code>logging_getLogStats</code> · <code>logging_getLogTimeline</code> · <code>logging_ingestLogs</code> · <code>logging_createLogIngester</code> · <code>logging_updateLogIngester</code> · <code>logging_deleteLogIngester</code></p>

      <h3>AI</h3>
      <p><code>ai_assistDeployment</code> · <code>ai_diagnoseIssue</code> · <code>ai_explainError</code> · <code>ai_generateTemplate</code> · <code>ai_listConversations</code> · <code>ai_getConversation</code> · <code>ai_createConversation</code> · <code>ai_sendChatMessage</code> · <code>ai_recommendSolution</code> · <code>ai_suggestFix</code></p>

      <h3>Marketplace</h3>
      <p><code>marketplace_browse</code> · <code>marketplace_search</code> · <code>marketplace_getTemplateDetails</code> · <code>marketplace_getFeatured</code> · <code>marketplace_listCategories</code> · <code>marketplace_listMySubmissions</code> · <code>marketplace_getSubmissionStatus</code> · <code>marketplace_submitItem</code> · <code>marketplace_updateSubmission</code> · <code>marketplace_submitReview</code> · <code>marketplace_approveSubmission</code> · <code>marketplace_rejectSubmission</code> · <code>marketplace_featureTemplate</code></p>

      <h3>Auth</h3>
      <p><code>auth_verify_email</code> · <code>auth_send_verification</code> · <code>auth_reset_password</code> · <code>auth_list_sessions</code> · <code>auth_revoke_session</code> · <code>auth_revoke_all_sessions</code> · <code>auth_list_organizations</code> · <code>auth_create_organization</code> · <code>auth_get_organization</code> · <code>auth_list_org_members</code> · <code>auth_list_org_teams</code> · <code>auth_create_team</code> · <code>auth_invite_user</code> · <code>auth_accept_invitation</code></p>

      <h3>Environment Variables</h3>
      <p><code>env_var_list</code> · <code>env_var_set</code> · <code>env_var_delete</code></p>
    `,
  },
];

export function getDoc(slug: string): Doc | undefined {
  return DOCS.find((d) => d.slug === slug);
}
