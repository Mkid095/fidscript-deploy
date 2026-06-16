# SDK Specification

JavaScript/TypeScript SDK for FIDScript Deploy.

---

## Installation

```bash
npm install @fidscript/sdk
# or
pnpm add @fidscript/sdk
```

---

## Quick Start

```typescript
import { createClient } from '@fidscript/sdk';

const client = createClient({
  apiKey: process.env.FIDSCRIPT_API_KEY,
  projectId: 'prj_abc123'
});

// Use platform services
const projects = await client.projects.list();
```

---

## Client Configuration

```typescript
interface ClientOptions {
  apiKey: string;
  projectId?: string;
  baseUrl?: string;
  timeout?: number;
}

const client = createClient({
  apiKey: 'fs_pk_xxx',
  projectId: 'prj_abc123',
  baseUrl: 'http://localhost:3001',
  timeout: 30000
});
```

---

## SDK Structure

```typescript
// Main client
client.auth       // Authentication
client.projects    // Project management
client.deployments // Deployment management
client.domains    // Domain management
client.storage    // File storage
client.databases  // Managed databases
client.email     // Email sending
client.realtime  // Realtime channels
client.functions  // Serverless functions
client.queues    // Message queues
client.cron      // Cron jobs
client.logs      // Log search
client.monitoring // Metrics
client.skills    // Skills marketplace
client.templates // Project templates
client.integrations // Provider management
```

---

## Auth Module

```typescript
// Register
const { user, token } = await client.auth.register({
  email: 'user@example.com',
  password: 'securepassword',
  name: 'John Doe'
});

// Login
const { user, token } = await client.auth.login({
  email: 'user@example.com',
  password: 'securepassword'
});

// Logout
await client.auth.logout();

// Magic link
await client.auth.magicLink({ email: 'user@example.com' });

// Get current user
const { user } = await client.auth.me();

// Update profile
const { user } = await client.auth.updateProfile({
  name: 'Jane Doe'
});

// Sessions
const { sessions } = await client.auth.sessions.list();
await client.auth.sessions.revoke(sessionId);
await client.auth.sessions.revokeAll();

// API Keys
const { apiKeys } = await client.auth.apiKeys.list();
const { apiKey, key } = await client.auth.apiKeys.create({
  name: 'Production Key',
  permissions: ['projects:read', 'deployments:write']
});
await client.auth.apiKeys.revoke(apiKeyId);

// MFA
const { secret, qrCode } = await client.auth.mfa.setup();
await client.auth.mfa.verify({ code: '123456' });
await client.auth.mfa.disable({ code: '123456' });
```

---

## Projects Module

```typescript
// List projects
const { projects, pagination } = await client.projects.list({
  status: 'active',
  page: 1,
  limit: 20
});

// Create project
const project = await client.projects.create({
  name: 'my-application',
  type: 'frontend',
  description: 'My web app'
});

// Get project
const project = await client.projects.get('prj_abc123');

// Update project
const project = await client.projects.update('prj_abc123', {
  name: 'new-name',
  envVars: { NODE_ENV: 'production' }
});

// Delete project
await client.projects.delete('prj_abc123');

// Suspend/Archive/Restore
const project = await client.projects.suspend('prj_abc123');
const project = await client.projects.archive('prj_abc123');
const project = await client.projects.restore('prj_abc123');

// Clone project
const project = await client.projects.clone('prj_abc123', {
  name: 'my-app-clone'
});

// Members
const { members } = await client.projects.members.list('prj_abc123');
await client.projects.members.add('prj_abc123', 'user@example.com', 'developer');
await client.projects.members.remove('prj_abc123', 'usr_xyz789');

// Environment variables
const { envVars } = await client.projects.envVars.list('prj_abc123');
await client.projects.envVars.update('prj_abc123', [
  { key: 'NODE_ENV', value: 'production' }
]);
await client.projects.envVars.delete('prj_abc123', 'OLD_VAR');
```

---

## Deployments Module

```typescript
// List deployments
const { deployments } = await client.deployments.list('prj_abc123', {
  page: 1,
  limit: 20
});

// Trigger deployment
const deployment = await client.deployments.create('prj_abc123', {
  branch: 'main',
  strategy: 'buildpack'
});

// Get deployment
const deployment = await client.deployments.get('prj_abc123', 'dpl_xyz789');

// Stream logs
const logStream = await client.deployments.logs('prj_abc123', 'dpl_xyz789');
for await (const log of logStream) {
  console.log(log);
}

// Rollback
const deployment = await client.deployments.rollback('prj_abc123', 'dpl_xyz789');

// Build config
const config = await client.deployments.getBuildConfig('prj_abc123');
await client.deployments.updateBuildConfig('prj_abc123', {
  buildCommand: 'npm run build',
  outputDirectory: 'dist'
});
```

---

## Storage Module

```typescript
// Buckets
const { buckets } = await client.storage.buckets.list();
const bucket = await client.storage.buckets.create('assets', {
  isPublic: false
});
await client.storage.buckets.delete('bkt_abc123');

// Files
const { files } = await client.storage.files.list('bkt_abc123', {
  prefix: 'images/',
  limit: 50
});

const file = await client.storage.files.upload('bkt_abc123', {
  key: 'images/logo.png',
  body: fs.createReadStream('./logo.png'),
  mimeType: 'image/png'
});

const buffer = await client.storage.files.download('bkt_abc123', 'file_xyz789');
await client.storage.files.delete('bkt_abc123', 'file_xyz789');

const url = await client.storage.files.getSignedUrl('bkt_abc123', 'images/logo.png', {
  expiresIn: 3600
});

const publicUrl = client.storage.files.getPublicUrl('bkt_abc123', 'images/logo.png');
```

---

## Email Module

```typescript
// Domains
const { domains } = await client.email.domains.list();
const { domain, dkimRecord, spfRecord } = await client.email.domains.add('myapp.com');
await client.email.domains.verify('edm_abc123');

// Mailboxes
const { mailboxes } = await client.email.mailboxes.list('edm_abc123');
const mailbox = await client.email.mailboxes.create('edm_abc123', {
  localPart: 'contact',
  password: 'securepassword'
});
await client.email.mailboxes.delete('mbx_xyz789');

// Send email
const { email, messageId } = await client.email.send({
  from: 'noreply@myapp.com',
  to: ['user@example.com'],
  subject: 'Welcome!',
  htmlBody: '<h1>Welcome!</h1>',
  textBody: 'Welcome!'
});

// Logs
const { logs } = await client.email.logs({ status: 'delivered' });
```

---

## Functions Module

```typescript
// List functions
const { functions } = await client.functions.list();

// Create function
const fn = await client.functions.create('processPayment', {
  runtime: 'nodejs18',
  description: 'Processes payments'
});

// Deploy function
const { function: updatedFn, version } = await client.functions.deploy('fn_abc123', {
  code: fs.readFileSync('./function.zip'),
  environment: { STRIPE_KEY: 'sk_xxx' }
});

// Invoke function
const { result, logs } = await client.functions.invoke('fn_abc123', {
  orderId: 'ord_123',
  amount: 99.99
});

// Get logs
const { logs } = await client.functions.getLogs('fn_abc123', { limit: 50 });

// Update settings
await client.functions.update('fn_abc123', {
  memoryMb: 512,
  timeoutSeconds: 60
});

// Delete
await client.functions.delete('fn_abc123');
```

---

## Queues Module

```typescript
// List queues
const { queues } = await client.queues.list();

// Create queue
const queue = await client.queues.create('order-notifications', {
  type: 'work',
  maxRetries: 3
});

// Publish message
const message = await client.queues.publish('q_abc123', {
  orderId: 'ord_123',
  type: 'confirmation'
}, { delayMs: 5000 });

// Consume messages
const unsubscribe = await client.queues.consume('q_abc123', async (message) => {
  console.log('Processing:', message.payload);
  // Process message
});

// List messages
const { messages } = await client.queues.getMessages('q_abc123', {
  status: 'pending',
  limit: 50
});

// Delete message
await client.queues.deleteMessage('q_abc123', 'msg_xyz789');

// Flush queue
await client.queues.flush('q_abc123');
```

---

## Cron Module

```typescript
// List cron jobs
const { jobs } = await client.cron.list();

// Create cron job
const job = await client.cron.create({
  name: 'daily-report',
  cronExpression: '0 9 * * *',
  endpoint: 'https://myapp.com/api/reports',
  method: 'POST',
  timezone: 'America/New_York'
});

// Update job
await client.cron.update('cj_abc123', {
  isActive: false,
  cronExpression: '0 10 * * *'
});

// Run immediately
const execution = await client.cron.run('cj_abc123');

// Get executions
const { executions } = await client.cron.getExecutions('cj_abc123', {
  limit: 50
});

// Delete job
await client.cron.delete('cj_abc123');
```

---

## Realtime Module

```typescript
// Connect
const conn = client.realtime.connect();

// Subscribe to channel
const sub = conn.subscribe('updates', {
  onMessage: (message, eventType) => {
    console.log('Received:', message);
  },
  onJoin: (client) => {
    console.log('Client joined:', client.userId);
  },
  onLeave: (client) => {
    console.log('Client left:', client.userId);
  }
});

// Publish to channel
await conn.publish('updates', { type: 'new_message' });

// Unsubscribe
sub.unsubscribe();

// Disconnect
conn.disconnect();

// Channel management
const { channels } = await client.realtime.channels.list();
const channel = await client.realtime.channels.create('chat', {
  isPrivate: false,
  presenceEnabled: true
});
const { clients } = await client.realtime.channels.getPresence('ch_abc123');
await client.realtime.channels.delete('ch_abc123');
```

---

## Monitoring & Logging

```typescript
// Monitoring
const { metrics } = await client.monitoring.getMetrics({
  metrics: ['cpu', 'memory'],
  from: '2026-06-16T00:00:00Z',
  to: '2026-06-16T12:00:00Z'
});

const { status, checks } = await client.monitoring.getHealth();

// Logging
const { logs } = await client.logs.search({
  search: 'error',
  service: 'api',
  severity: 'error',
  limit: 100
});

for await (const log of client.logs.stream({ service: 'api' })) {
  console.log(log);
}
```

---

## Skills & Templates

```typescript
// Skills
const { skills } = await client.skills.list({ category: 'crm' });
const installation = await client.skills.install('sk_abc123', {
  config: { apiKey: 'xxx' }
});
await client.skills.uninstall('sk_abc123');

// Templates
const { templates } = await client.templates.list({ category: 'saas' });
const { template } = await client.templates.get('tpl_xyz789');
const project = await client.templates.generate('tpl_xyz789', {
  name: 'my-saas',
  variables: { APP_NAME: 'My SaaS' }
});
```

---

## Type Definitions

All types are exported from the SDK:

```typescript
import type {
  User,
  Project,
  Deployment,
  StorageFile,
  EmailLog,
  PlatformFunction,
  Queue,
  CronJob,
  RealtimeChannel,
  Integration
} from '@fidscript/sdk';
```

---

## Error Handling

```typescript
import { FidscriptError } from '@fidscript/sdk';

try {
  const project = await client.projects.create({ ... });
} catch (error) {
  if (error instanceof FidscriptError) {
    console.log(error.code);    // 'VALIDATION_ERROR'
    console.log(error.message); // 'Invalid project name'
    console.log(error.details); // [{ field: 'name', message: '...' }]
  }
}
```

---

## Webhooks

For webhook handling:

```typescript
import { verifyWebhook } from '@fidscript/sdk';

app.post('/webhooks/fidscript', (req, res) => {
  const event = verifyWebhook(req.body, req.headers['x-fidscript-signature']);

  switch (event.type) {
    case 'deployment.succeeded':
      console.log('Deployment succeeded:', event.data);
      break;
    // Handle other events
  }

  res.status(200).send('OK');
});
```
