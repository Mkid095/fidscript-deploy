import express from 'express';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import path from 'path';
import dotenv from 'dotenv';

// Load variables
dotenv.config();

// Platform State Storage (In-memory mock DB mimicking standard self-hosted databases)
let projects = [
  { id: '1', name: 'fidscriptwhatsapp', type: 'backend', status: 'active', url: 'https://fidscriptwhatsapp.fidscript.dev', repo: 'github.com/developer/fidscriptwhatsapp', lastDeployed: 'Created 2 days ago', port: 4001, mode: 'Production • Development' },
  { id: '2', name: 'MONEYKEEP', type: 'static', status: 'active', url: 'https://moneykeep.fidscript.dev', repo: 'github.com/developer/moneykeep', lastDeployed: 'Created 3 days ago', port: 3001, mode: 'Production • Development' },
  { id: '3', name: 'nats-queue-worker', type: 'worker', status: 'active', url: 'https://queue.fidscript.dev', repo: 'github.com/developer/worker-micro', lastDeployed: 'Created 4 days ago', port: 8222, mode: 'Internal System' }
];

let dbNodes = [
  { name: 'postgres-srv', type: 'PostgreSQL', status: 'online', cpu: 1.8, memory: '142 MB', port: 5432 },
  { name: 'redis-cache', type: 'Redis', status: 'online', cpu: 0.6, memory: '48 MB', port: 6379 },
  { name: 'nats-broker', type: 'NATS', status: 'online', cpu: 0.9, memory: '34 MB', port: 4222 },
  { name: 'minio-s3', type: 'MinIO', status: 'online', cpu: 0.3, memory: '91 MB', port: 9000 },
  { name: 'stalwart-smtp', type: 'Stalwart Mail', status: 'online', cpu: 1.2, memory: '110 MB', port: 25 },
  { name: 'traefik-proxy', type: 'Traefik', status: 'online', cpu: 1.5, memory: '68 MB', port: 80 }
];

let natsBusEvents = [
  { id: 'e1', subject: 'user.signup', data: '{"userId":"usr_772","email":"new_dev@domain.com"}', time: '12:04:15.112', latency: '0.8ms' },
  { id: 'e2', subject: 'payment.success', data: '{"invoiceId":"inv_998","amount":14900}', time: '12:04:18.411', latency: '1.2ms' },
  { id: 'e3', subject: 'system.autoscale', data: '{"container":"corporate-portal","replicas":2}', time: '12:04:22.903', latency: '1.5ms' }
];

let emailLogs = [
  { id: 'em1', from: 'no-reply@fidscript.dev', to: 'kennedygithinjioffice@gmail.com', subject: 'Cluster Setup Completed Successfully', content: 'FIDScript has bootstrapped Traefik with automatic Let\'s Encrypt SSL validation successfully on your cluster.', timestamp: '10 mins ago', status: 'sent' },
  { id: 'em2', from: 'auth@fidscript.dev', to: 'developer@domain.com', subject: 'Your secure login magic link', content: 'Your secure login magic code is 884-291. It will expire in 10 minutes.', timestamp: '3 hours ago', status: 'sent' }
];

let platformEvents = [
  { id: 'p1', type: 'project.created', message: 'Project "ecommerce-api" deployed to container swarm', time: '10 mins ago', severity: 'success' },
  { id: 'p2', type: 'domain.verified', message: 'Custom domain "ecommerce-api.fidscript.dev" TLS rules applied', time: '12 mins ago', severity: 'success' },
  { id: 'p3', type: 'database.backup', message: 'PostgreSQL nightly backup saved to MinIO cluster', time: '1 hour ago', severity: 'info' }
];

let skills = [
  { id: 'sk1', name: 'CMS Blog Generator', category: 'Publishing', desc: 'Auto Deploy Astro-based MDX blogs with server-client state systems.', installed: true },
  { id: 'sk2', name: 'Stripe SaaS Subscription', category: 'Finance', desc: 'Pre-configured webhooks, Stripe billing dashboards, and access authorization.', installed: false },
  { id: 'sk3', name: 'Telegram Storage Link', category: 'Infinity Drive', desc: 'Adapter system to utilize private Telegram API channels as unlimited media storage.', installed: false },
  { id: 'sk4', name: 'Google Workspace Sync', category: 'Integration', desc: 'Sync project cron pipelines automatically to Google Calendar schedules & email logs.', installed: false }
];

let domains = [
  { 
    id: 'd1', 
    domainName: 'cluster-daemon.fidscript.dev', 
    vpsIp: '138.197.82.110', 
    status: 'active', 
    aRecordStatus: 'valid', 
    sslStatus: 'active',
    dnsPropagation: { london: 'valid', newyork: 'valid', tokyo: 'valid', singapore: 'valid', sydney: 'valid' },
    createdTime: '5 days ago'
  },
  { 
    id: 'd2', 
    domainName: 'shop.fidscript.dev', 
    vpsIp: '138.197.82.110', 
    status: 'pending_dns', 
    aRecordStatus: 'missing', 
    sslStatus: 'inactive',
    dnsPropagation: { london: 'valid', newyork: 'missing', tokyo: 'missing', singapore: 'missing', sydney: 'missing' },
    createdTime: '2 hours ago'
  }
];

// Build logs buffer to stream to user during project creation
const activeBuildLogs: Record<string, string[]> = {};

async function startServer() {
  const app = express();
  app.use(express.json());

  // --- API Endpoints ---

  // Projects Engine (Phase 4)
  app.get('/api/projects', (req, res) => {
    res.json(projects);
  });

  app.post('/api/projects', (req, res) => {
    const { name, type, repo } = req.body;
    if (!name) {
      return res.status(400).json({ error: 'Name is required' });
    }

    const cleanName = name.replace(/[^a-zA-Z0-9-]/g, '').toLowerCase();
    const newId = (projects.length + 1).toString();
    const port = 3000 + projects.length + 1;

    const newProject = {
      id: newId,
      name: cleanName,
      type: type || 'frontend',
      status: 'deploying',
      url: `https://${cleanName}.fidscript.dev`,
      repo: repo || `github.com/developer/${cleanName}`,
      lastDeployed: 'Created Just now',
      port,
      mode: 'Production • Development'
    };

    projects.push(newProject);

    // Bootstrap build logs simulation
    activeBuildLogs[newId] = [
      `[BUILD] Initiating deployment for "${cleanName}"`,
      `[BUILD] Git source matching: ${newProject.repo}`,
      `[BUILD] Packaging bundle using standard cloud buildpacks...`,
      `[BUILD] running 'pnpm install' to parse packages Tree`,
      `[BUILD] Output compiled static folders to destination /var/www`,
      `[DOCKER] Spawning container instance [fidscript-app-${cleanName}]`,
      `[TRAEFIK] Mapping domain path to port ${port}`,
      `[TRAEFIK] Requesting TLS security certification from Let's Encrypt`,
      `[SUCCESS] App stream is live at: ${newProject.url}`
    ];

    // Trigger platform event
    platformEvents.unshift({
      id: 'p' + Date.now(),
      type: 'project.created',
      message: `Project "${cleanName}" deployment queued`,
      time: 'Just now',
      severity: 'info'
    });

    // Simulate async deploy completion after 4 seconds
    setTimeout(() => {
      const idx = projects.findIndex(p => p.id === newId);
      if (idx !== -1) {
        projects[idx].status = 'active';
        platformEvents.unshift({
          id: 'p' + Date.now(),
          type: 'project.created',
          message: `Successfully deployed "${cleanName}" to VPS docker swarm`,
          time: 'Just now',
          severity: 'success'
        });
      }
    }, 4000);

    res.json(newProject);
  });

  app.get('/api/projects/logs/:id', (req, res) => {
    const { id } = req.params;
    res.json(activeBuildLogs[id] || ['[SYSTEM] System waiting for build execution...']);
  });

  app.delete('/api/projects/:id', (req, res) => {
    const { id } = req.params;
    const projectToDelete = projects.find(p => p.id === id);
    if (projectToDelete) {
      projects = projects.filter(p => p.id !== id);
      platformEvents.unshift({
        id: 'p' + Date.now(),
        type: 'project.deleted',
        message: `Terminated and unlinked container app "${projectToDelete.name}"`,
        time: 'Just now',
        severity: 'warning'
      });
      res.json({ success: true, message: 'Unlinked successfully.' });
    } else {
      res.status(404).json({ error: 'Project not found' });
    }
  });

  // Database Platform (Phase 12)
  app.get('/api/db-nodes', (req, res) => {
    res.json(dbNodes);
  });

  app.post('/api/db-nodes/toggle', (req, res) => {
    const { name } = req.body;
    dbNodes = dbNodes.map(node => {
      if (node.name === name) {
        const nextStatus = node.status === 'online' ? 'offline' : 'online';
        platformEvents.unshift({
          id: 'p' + Date.now(),
          type: 'database.toggle',
          message: `Database daemon "${name}" state altered: ${nextStatus.toUpperCase()}`,
          time: 'Just now',
          severity: 'info'
        });
        return { ...node, status: nextStatus };
      }
      return node;
    });
    res.json({ success: true, dbNodes });
  });

  app.post('/api/query-sql', (req, res) => {
    const { sql } = req.body;
    if (!sql) {
      return res.status(400).json({ error: 'Sql statement query can not be empty' });
    }

    const cleanSql = sql.trim().toLowerCase();

    if (cleanSql.includes('select') && cleanSql.includes('projects')) {
      res.json({
        columns: ['id', 'name', 'type', 'status', 'url'],
        rows: projects.map(p => [p.id, p.name, p.type, p.status, p.url])
      });
    } else if (cleanSql.includes('select') && cleanSql.includes('users')) {
      res.json({
        columns: ['id', 'email', 'role', 'status', 'created_at'],
        rows: [
          ['1', 'kennedygithinjioffice@gmail.com', 'admin', 'active', '2026-06-15 10:24'],
          ['2', 'dev_team@fidscript.io', 'developer', 'active', '2026-06-16 12:00'],
          ['3', 'guest_tester@domain.com', 'guest', 'inactive', '2026-06-16 07:18']
        ]
      });
    } else if (cleanSql.includes('insert') || cleanSql.includes('update') || cleanSql.includes('delete')) {
      platformEvents.unshift({
        id: 'p' + Date.now(),
        type: 'database.mutation',
        message: 'SQL database table mutation executed successfully',
        time: 'Just now',
        severity: 'info'
      });
      res.json({
        columns: ['query_status', 'rows_affected', 'details'],
        rows: [['SUCCESS', '1', 'Transaction committed to active database configuration']]
      });
    } else {
      res.json({
        columns: ['error_code', 'message', 'hint'],
        rows: [['42P01', `Relation table not defined under search query: "${sql}"`, 'Try executing: SELECT * FROM projects; or SELECT * FROM users;']]
      });
    }
  });

  // Realtime Platform (Phase 11 via NATS Bus)
  app.get('/api/nats-events', (req, res) => {
    res.json(natsBusEvents);
  });

  app.post('/api/nats-events', (req, res) => {
    const { subject, data } = req.body;
    if (!subject) {
      return res.status(400).json({ error: 'Subject is mandatory' });
    }

    const newEvent = {
      id: 'e' + Date.now(),
      subject,
      data: data || '{}',
      time: new Date().toTimeString().split(' ')[0] + '.' + Math.floor(Math.random() * 1000),
      latency: (Math.random() * 1.5 + 0.2).toFixed(1) + 'ms'
    };

    natsBusEvents.unshift(newEvent);

    platformEvents.unshift({
      id: 'p' + Date.now(),
      type: 'realtime.nats_event',
      message: `Published local socket event to channel "${subject}"`,
      time: 'Just now',
      severity: 'info'
    });

    res.json(newEvent);
  });

  // Email Platform (Phase 10 SMTP outbox logs)
  app.get('/api/emails', (req, res) => {
    res.json(emailLogs);
  });

  app.post('/api/emails', (req, res) => {
    const { to, subject, content } = req.body;
    if (!to || !subject) {
      return res.status(400).json({ error: 'Destination and Subject lines are required' });
    }

    const newEmail = {
      id: 'em' + Date.now(),
      from: 'no-reply@fidscript.dev',
      to,
      subject,
      content: content || '',
      timestamp: 'Just now',
      status: 'sent'
    };

    emailLogs.unshift(newEmail);

    platformEvents.unshift({
      id: 'p' + Date.now(),
      type: 'email.sent',
      message: `SMTP transactional outbox dispatched request to "${to}" through Stalwart SMTP client`,
      time: 'Just now',
      severity: 'success'
    });

    res.json(newEmail);
  });

  // Skills Platform (Phase 20)
  app.get('/api/skills', (req, res) => {
    res.json(skills);
  });

  app.post('/api/skills/toggle', (req, res) => {
    const { id } = req.body;
    skills = skills.map(s => {
      if (s.id === id) {
        const nextState = !s.installed;
        platformEvents.unshift({
          id: 'p' + Date.now(),
          type: nextState ? 'skill.installed' : 'skill.uninstalled',
          message: `${nextState ? 'Installed' : 'Unlinked'} skill extension package "${s.name}"`,
          time: 'Just now',
          severity: nextState ? 'success' : 'warning'
        });
        return { ...s, installed: nextState };
      }
      return s;
    });
    res.json({ success: true, skills });
  });

  // Platform Events
  app.get('/api/events', (req, res) => {
    res.json(platformEvents);
  });

  // Domain Management Engine (Phase 24)
  app.get('/api/domains', (req, res) => {
    res.json(domains);
  });

  app.post('/api/domains', (req, res) => {
    const { domainName } = req.body;
    if (!domainName) {
      return res.status(400).json({ error: 'Domain name is required' });
    }
    const cleanDomain = domainName.trim().toLowerCase().replace(/^(https?:\/\/)?(www\.)?/, '');
    
    if (domains.some(d => d.domainName === cleanDomain)) {
      return res.status(400).json({ error: 'Domain already configured on this cluster' });
    }

    const newId = 'd' + Date.now();
    const newDomain = {
      id: newId,
      domainName: cleanDomain,
      vpsIp: '138.197.82.110',
      status: 'pending_dns',
      aRecordStatus: 'missing',
      sslStatus: 'inactive',
      dnsPropagation: { 
        london: 'missing', 
        newyork: 'missing', 
        tokyo: 'missing', 
        singapore: 'missing', 
        sydney: 'missing' 
      },
      createdTime: 'Just now'
    };

    domains.push(newDomain);

    platformEvents.unshift({
      id: 'p' + Date.now(),
      type: 'domain.added',
      message: `Custom domain "${cleanDomain}" added to cluster config routes`,
      time: 'Just now',
      severity: 'info'
    });

    res.json(newDomain);
  });

  app.post('/api/domains/verify/:id', (req, res) => {
    const { id } = req.params;
    const domainIdx = domains.findIndex(d => d.id === id);
    if (domainIdx === -1) {
      return res.status(404).json({ error: 'Domain not found' });
    }

    const domainObj = domains[domainIdx];
    // Simulator toggles propagation status. First click sets to valid, some random pending. Next click can make full active.
    const isCurrentlyPending = domainObj.status === 'pending_dns';
    const simulateSuccess = isCurrentlyPending ? Math.random() > 0.4 : true;

    if (simulateSuccess) {
      domains[domainIdx] = {
        ...domainObj,
        status: 'active',
        aRecordStatus: 'valid',
        sslStatus: 'active',
        dnsPropagation: { london: 'valid', newyork: 'valid', tokyo: 'valid', singapore: 'valid', sydney: 'valid' }
      };
      
      platformEvents.unshift({
        id: 'p' + Date.now(),
        type: 'domain.verified',
        message: `Custom domain "${domainObj.domainName}" DNS records resolved. SSL active.`,
        time: 'Just now',
        severity: 'success'
      });
    } else {
      const randLondon = Math.random() > 0.4 ? 'valid' : 'missing';
      const randNewYork = Math.random() > 0.4 ? 'valid' : 'missing';
      domains[domainIdx] = {
        ...domainObj,
        status: 'error',
        aRecordStatus: 'missing',
        sslStatus: 'inactive',
        dnsPropagation: { 
          london: randLondon, 
          newyork: randNewYork, 
          tokyo: 'missing', 
          singapore: 'missing', 
          sydney: 'missing' 
        }
      };
      
      platformEvents.unshift({
        id: 'p' + Date.now(),
        type: 'domain.error',
        message: `Custom domain "${domainObj.domainName}" resolved with error. A records missing.`,
        time: 'Just now',
        severity: 'error'
      });
    }

    res.json(domains[domainIdx]);
  });

  app.delete('/api/domains/:id', (req, res) => {
    const { id } = req.params;
    const domainToDelete = domains.find(d => d.id === id);
    if (domainToDelete) {
      domains = domains.filter(d => d.id !== id);
      platformEvents.unshift({
        id: 'p' + Date.now(),
        type: 'domain.deleted',
        message: `Custom domain "${domainToDelete.domainName}" unlinked from cluster Traefik proxy.`,
        time: 'Just now',
        severity: 'warning'
      });
      res.json({ success: true });
    } else {
      res.status(404).json({ error: 'Domain not found' });
    }
  });

  // AI Copilot Integration using server-side Gemini SDK (Phase 22)
  app.post('/api/copilot', async (req, res) => {
    const { prompt } = req.body;
    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        // Fallback response with clean explanations if key is unset in secrets
        return res.json({
          response: `🛠️ **Local Agent Assistant** (Running Offline Mode):\n\nI received your query: "${prompt}".\n\nTo operate on fully functional LLM capabilities, declare the \`GEMINI_API_KEY\` variable inside your **Settings > Secrets** UI tab.\n\n*Currently I can run system diagnostics dynamically. If you want to deploy projects instantly, type \`/create-project [name]\` directly in this console.*`
        });
      }

      // Initialize properly using GoogleGenAI as suggested in gemini-api guidelines
      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build'
          }
        }
      });

      // Query content text models using our designated gemini-3.5-flash
      const response = await ai.models.generateContent({
        model: 'gemini-3.5-flash',
        contents: prompt,
        config: {
          systemInstruction: "You are the FIDScript intelligent Developer OS agent command center companion. You are dedicated to helping professional developer users inspect and write backend application microservices, deploy Traefik routing protocols, inspect Stalwart secure mail relays, write pnpm module commands, and format basic SQL database scripts. Provide responses in a standard, clean, authoritative format. Use clear Markdown but with simple, professional, humble words. Avoid tech-larping naming buzzwords."
        }
      });

      res.json({ response: response.text });
    } catch (err: any) {
      console.error(err);
      res.status(500).json({ error: err.message || 'Fatal response processing error inside Gemini AI agent service' });
    }
  });

  // --- Serve Client Front-end SPA ---

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Serve production static build
    const distPath = path.resolve('dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const port = 3000;
  app.listen(port, '0.0.0.0', () => {
    console.log(`[FIDSCRIPT SUCCESS] Live Platform server listening on port ${port}`);
  });
}

startServer().catch(err => {
  console.error('[FATAL BOOT ERROR]', err);
});
