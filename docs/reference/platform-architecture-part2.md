# FIDScript Deploy — Platform Architecture Documentation (Part 2)

## 5. Authentication Service

Built like Supabase Auth. Uses JWTs for stateless authentication.

### Backend System

- **Methods:** Email/Password, Magic Links, OTP
- **Storage:** Users in project's PostgreSQL schema
- **Sessions:** `sessions` table tracks token, device, IP, expiration

### Frontend Components

1. **Auth Settings Page**
   - Toggle methods: Email/Password, Magic Link, OTP
   - `PATCH /api/projects/:id/auth/config`

2. **User Management Dashboard**
   - Paginated user list: ID, email, created, last sign-in
   - Actions: Delete User, Send Magic Link

---

## 6. Queue Service

Background job processing like BullMQ. Each project has isolated queues.

### Backend System

- Redis-backed queue workers
- Project isolation: `project_123:email`, `project_123:image-process`
- Job statuses: waiting, active, completed, failed
- Supports: retries, delay, dead-letter-queue, visibility timeout

### Frontend Components

1. **Queue Management Page**
   - List of queues for current project
   - "Create Queue" → modal with Name, Retries, Timeout, DLQ, Retention
   - `POST /api/projects/:id/queues`

2. **Queue Dashboard**
   - Cards: Waiting / Processing / Completed / Failed counts
   - Poll backend every few seconds
   - Click job ID → modal with payload, logs, retry history

3. **Publish Message**
   - Payload (JSON or plain text)
   - Delay (seconds)
   - Custom headers (key-value pairs)

---

## 7. Scheduler Service

Per-project cron jobs. Supports multiple action types.

### Backend System

- Cron expression evaluation (node-cron or equivalent)
- Action types:
  - **HTTP Request:** `method`, `url`, `headers`, `body`
  - **Function:** invoke a deployed function
  - **Email:** send via email service
  - **Queue Job:** enqueue a job
  - **Custom Code:** sandboxed execution (Docker container or V8 isolate)
- Execution history with status, duration, output/error

### Frontend Components

1. **Scheduler Dashboard**
   - List of scheduled jobs with next run, status, action type
   - "Create Schedule" button

2. **Job Form**
   - Name, Cron expression, Timezone
   - Action type selector:
     - HTTP: method (GET/POST/PUT/PATCH/DELETE), URL, headers, body
     - Function: dropdown from `sdk.functions.list(projectId)`
     - Email: recipient, template
     - Queue: queue selector, payload
     - Custom Code: Monaco editor with JS/TS syntax
   - Execution history tab

---

## 8. Email Platform

Integrates with database, scheduler, and functions.

### Backend System

- SMTP (Stalwart) for sending
- Templates with variable substitution (`{{user.name}}`)
- Templates can query project database for dynamic data
- Delivery status: sent, delivered, bounced, failed

### Frontend Components

1. **Email Settings Page**
   - SMTP credentials: Host, Port, Auth Method, TLS
   - IMAP credentials displayed
   - "Send Test Email" button

2. **Template Editor**
   - HTML editor with variable sidebar
   - Variables: `{{user.name}}`, `{{company.logo}}`, etc.
   - Preview with sample data

3. **Mailbox/Alias/Identity Management**
   - Per-domain: create mailbox, alias, identity
   - IMAP/SMTP connection info displayed

4. **Email Logs**
   - Sent emails with status, recipient, timestamp

---

## 9. Domain Management

One project = one main domain + multiple subdomains. Integrates with Cloudflare for SaaS.

### Backend System

1. User submits domain
2. Backend creates custom hostname via Cloudflare API
3. Cloudflare returns DNS validation records
4. Backend polls Cloudflare until DNS verified + SSL provisioned
5. Domain status → "Active"

### Frontend Components

1. **Domains Page**
   - List of domains associated with project
   - "Add Domain" → wizard: submit → show DNS records → verify → active
   - Status badge: Pending, Verifying, Active, Error

2. **Domain Detail**
   - Subdomain management
   - SSL certificate status
   - Cloudflare integration status

3. **Email Integration on Domain**
   - Mailboxes, aliases, identities
   - IMAP/SMTP credentials
   - Integration guides

### Subdomain Flow
- Main domain linked to project
- Subdomains created during deployment configuration
- If a domain is already a main domain in another project, subdomains can still be added
