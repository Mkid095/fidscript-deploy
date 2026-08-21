# FIDScript Frontend Rebuild Blueprint

> **Purpose:** Complete specification for rebuilding the FIDScript frontend — landing page through full dashboard. This doc is the **contract** between the platform vision and the implementation. It describes what each page must contain, what operations it enables, what data it works with, and what the API endpoints are. Someone rebuilding the frontend from scratch should be able to follow this doc and produce a working, integrated application.

> **Status:** Blueprint — not yet implemented. Build order: Landing → Auth → Projects → per-service pages.

---

## Part 1: Platform Vision

### What FIDScript Is

FIDScript is an **operator's control plane for backend services**. It is not a visualization dashboard — it is the console through which a developer or operator manages their entire server infrastructure. Every page is the operator interface for one or more **real backend entities** (Prisma models), not a display of pre-fetched data.

### The One-Domain Fan-Out

A single FIDScript deployment manages:
- **Projects** (grouping construct)
- **Deployments** (apps running on the VPS)
- **Functions** (edge/serverless)
- **Databases** (PostgreSQL)
- **Storage** (S3-compatible object storage)
- **Queues** (job queues)
- **Scheduler** (cron jobs)
- **Email** (inbound/outbound mail)
- **Domains** (DNS + TLS)
- **Monitoring** (metrics + alerts)
- **Logs** (centralized logging)
- **Realtime** (WebSocket presence)
- **MCP** (AI agent integration)
- **Marketplace** (templates)

From a single project, an operator fans out to all of these. The sidebar reflects this hierarchy.

### Five Design Principles

1. **Configure Once** — sensible defaults, minimal clicks to first deployment
2. **Beginner First** — empty states explain what to do, not just that nothing exists
3. **Production-Ready** — every feature works end-to-end, no mock data in production
4. **Observable** — status, health, and metrics visible everywhere
5. **One Dashboard** — everything in one place, no tab-switching between tools

### Operating-System Framing

The dashboard is the **operator's OS for their server**. This means:
- Every screen shows **real entity fields** with their actual values
- Every button calls a **real inventory endpoint** (stable IDs like `DEPL-02`, `DB-01`)
- Every screen renders **differently per role** — owner/admin/developer/viewer each see different fields, buttons, and chrome
- Every gap in the backend is **greyed out with "not yet available"** — never faked
- The sidebar is the **application launcher** — clicking a project opens its full control panel

---

## Part 2: Navigation Architecture

### Sidebar Structure

The sidebar is the primary navigation. It has these top-level items (in order):

```
┌─────────────────────────────────────┐
│  FIDScript (logo)                  │
├─────────────────────────────────────┤
│  Dashboard (home icon)              │
├─────────────────────────────────────┤
│  Projects ▾                        │
│    ├─ My First Project → services   │
│    └─ Project 2 → services          │
├─────────────────────────────────────┤
│  Deployments                        │
│  Functions                          │
│  Databases                          │
│  Storage                            │
│  Queues                             │
│  Scheduler                           │
│  Email                              │
│  Domains                            │
│  Monitoring                         │
│  Logs                               │
├─────────────────────────────────────┤
│  MCP Server                         │
│  Marketplace                        │
├─────────────────────────────────────┤
│  Settings                           │
└─────────────────────────────────────┘
```

**Sidebar item rules:**
- Each top-level item (Deployments, Functions, etc.) shows a **global list** of all entities across all projects
- Each project in the Projects list expands to show **that project's services** as children
- Clicking a project or service opens the project's detail view
- Role-based: `viewer` sees items but most actions are disabled
- Empty state for each section: if no deployments exist, the Deployments page shows onboarding, not an error

### Global Elements

**Top bar (always visible):**
- Left: Sidebar toggle (hamburger icon)
- Center: Global search (cmd+K / Ctrl+K — searches across all entities)
- Right: Notifications bell, Account menu

**Account menu (dropdown):**
- User email + role badge
- "Account Settings" → `/settings`
- "API Keys" → `/settings/api-keys`
- "Sign Out"

**Command Palette (cmd+K):**
- Fuzzy search across all projects, deployments, functions, databases, domains
- Actions: "Create project", "Create deployment", "Open logs", etc.
- Keyboard navigable

---

## Part 3: Landing Page (`/`)

### Purpose

The public landing page for `deploy.fidscript.com`. Sells the platform to visitors. No auth required.

### Page Sections

**1. Hero Section**
- Headline: "Your private cloud, on your own server"
- Subheadline: "Deploy apps, databases, email, queues, and cron jobs — fully open source, on hardware you control."
- CTA: "Get Started" → `/setup` (first-time) or `/projects` (authenticated)
- Secondary: "View documentation" → `/docs`
- Visual: Terminal animation showing a deployment workflow

**2. Features Grid (3 columns)**
- "One-Command Deploy" — git push to production
- "Built-in Databases" — PostgreSQL with automatic backups
- "Edge Functions" — run code at the edge, close to your users
- "Email Platform" — send and receive mail from your own domain
- "Job Queues" — background processing without third-party services
- "Scheduled Tasks" — cron jobs managed in one dashboard
- "AI Agent Ready" — MCP server for Claude, Copilot, and custom agents
- "Your Hardware" — no vendor lock-in, runs on any VPS

**3. How It Works (3 steps)**
- Step 1: Install on a clean VPS (one command)
- Step 2: Connect a domain and deploy your first app
- Step 3: Manage everything from one dashboard

**4. Pricing Section**
- "Open Source" — free, runs on your infrastructure
- "No per-seat pricing" — unlimited users
- "No data leaving your server"

**5. Footer**
- Links: Documentation, GitHub, Changelog, Status
- "© 2026 FIDScript"

### Data Model

Landing page is static — no backend data. All content is hardcoded in the page component.

### API Endpoints

None required (static page).

### Component Inventory

- `HeroSection` — headline, subheadline, CTAs, terminal animation
- `FeatureCard` — icon, title, description
- `StepCard` — step number, title, description
- `PricingCard` — title, price, feature list
- `Footer` — links, copyright

---

## Part 4: Setup Wizard (`/setup`)

### Purpose

First-time installation flow. Appears when `lifecycle = UNCONFIGURED`. Configures the platform (admin account, domain, email, etc.). One-time only.

### Steps

**Step 1: Admin Account**
- Fields: Email, Password, Confirm Password
- Validation: email format, password strength (min 8 chars)
- CTA: "Next"

**Step 2: Platform Setup**
- Fields: Platform Domain (e.g. `deploy.example.com`), Platform Name (e.g. "My FIDScript")
- Auto-detected: public IP of the VPS
- CTA: "Next"

**Step 3: Email Configuration (optional)**
- Fields: SMTP Host, SMTP Port, SMTP User, SMTP Password, From Address
- "Skip for now" link
- CTA: "Next"

**Step 4: Review & Install**
- Summary of all configured values
- CTA: "Install Platform"
- Progress indicator during installation
- On success: redirect to `/onboarding`

**Step 5: Onboarding**
- Welcome message with platform name
- 4 quick-start cards: "Deploy an app", "Add a database", "Connect a domain", "Set up email"
- CTA: "Go to Dashboard" → `/projects`

### API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/v1/installation/setup` | Submit installation config (admin, domain, email) |
| GET | `/api/v1/installation/status` | Returns `{ lifecycle, platformDomain }` |
| POST | `/api/v1/installation/complete` | Mark installation complete |

### Data Model

Installation state stored in DB. `Lifecycle` enum: `UNCONFIGURED → CONFIGURING → ACTIVE → FAILED`.

---

## Part 5: Authentication

### Login Page (`/login`)

**Fields:**
- Email input (with autocomplete)
- Password input (with show/hide toggle)
- "Forgot password?" link
- CTA: "Sign in"

**Below form:**
- "Don't have an account? Sign up" link (if `SIGNUP_INVITE_KEYWORD` is set, shows keyword input)

**Behavior:**
- On success: redirect to `next` query param or `/projects`
- On failure: inline error message below the form (not a modal)
- Loading state: button shows spinner, inputs disabled

**Error messages (friendly):**
- "Invalid email or password" (never reveals which is wrong)
- "Your session has expired" (for expired JWT)
- "Too many attempts. Try again in X minutes" (rate limited)

### Register Page (`/register`)

**Fields:**
- Email input
- Name input
- Password input + confirm password
- Invite keyword (if required by platform)
- CTA: "Create account"

**Behavior:**
- On success: auto-login and redirect to `/onboarding`
- Duplicate email: "An account with this email already exists"

### Magic Link Flow

**For forgot password / passwordless login:**
1. User enters email → "Send magic link"
2. Email sent with link: `/auth/verify?token=xxx`
3. User clicks link → session created → redirect to `/projects`

### API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/v1/auth/login` | Login with email + password → `{ accessToken, refreshToken }` |
| POST | `/api/v1/auth/register` | Create account → `{ accessToken, refreshToken }` |
| POST | `/api/v1/auth/magic/send` | Send magic link to email |
| POST | `/api/v1/auth/magic/verify` | Verify magic token → `{ accessToken, refreshToken }` |
| POST | `/api/v1/auth/refresh` | Refresh access token |
| POST | `/api/v1/auth/logout` | Revoke session |
| GET | `/api/v1/auth/me` | Get current user `{ id, email, role }` |
| POST | `/api/v1/auth/password/reset/send` | Send password reset email |
| POST | `/api/v1/auth/password/reset/confirm` | Reset password with token |

### Session Management

- Access token: JWT, 15-minute expiry, stored in `localStorage` as `fidscript_access_token`
- Refresh token: opaque, 30-day expiry, stored in `localStorage` as `fidscript_refresh_token`
- On 401: transparent refresh attempt via `/auth/refresh`
- On refresh failure: redirect to `/login`

### Account API Keys (`/settings/api-keys`)

Manage account-level API keys (`fsk_` prefix).

**List view:**
- Table: Name, Prefix (`fsk_a1b2...`), Scopes (as chips), Expires (relative: "in 23 days"), Created, Actions
- Actions: Copy key (if just created), Revoke
- Empty state: "No API keys yet. Create one to connect AI agents, CLI, or SDK."

**Create key modal:**
- Fields: Name (required), Scopes (multi-select from allowlist), Expiry (30m / 1h / 7d / 30d / never)
- On submit: key shown ONCE in a banner — "Copy this key now. You will not see it again."

**AI Agent Instructions panel:**
- Read-only textarea showing the generated AI prompt (scoped to the selected key's permissions)
- Copy button
- This is the **AI Control Center** — collapsed by default, expands on the Projects page

### Design Patterns for Auth Pages

- Centered card on a gradient/dark background
- No sidebar, no top bar — pure auth focus
- Responsive: stacks vertically on mobile
- All inputs have visible labels (no placeholder-only)
- Loading states on every button
- Inline validation (validate on blur, not on submit)

---

## Part 6: Projects

### Projects List Page (`/projects`)

**Purpose:** Entry point after login. Shows all projects the user has access to.

**Page structure:**

```
┌─────────────────────────────────────────────────────┐
│  [Sidebar]  Projects                    [+ New]    │
│             3 projects · Deploy and manage your    │
│             applications from one place             │
│                                                     │
│  [Search bar]                    [Refresh] [👁 2] │
│                                                     │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐          │
│  │ Project 1│  │ Project 2│  │ Project 3│          │
│  │ ● Active │  │ ● Active │  │ ⚠ Error  │          │
│  │ 3 deploy │  │ 1 deploy │  │ 0 deploy │          │
│  │ Open →   │  │ Open →   │  │ Open →   │          │
│  └──────────┘  └──────────┘  └──────────┘          │
│                                                     │
│  ── Developer & AI Access ──────────────────────    │
│  [▸ Show API Keys]                                  │
│  └─ collapsed by default (avoids unnecessary API    │
│      calls on page load)                           │
└─────────────────────────────────────────────────────┘
```

**Header:**
- Title: "Projects"
- Subtitle: "Deploy applications, databases, domains, and automation"
- Shows total count and filtered count when searching

**Search:**
- Real-time filter by project name, slug, or description
- "X of Y projects" shown when filtered

**Project cards:**
- Project name (bold)
- Status badge: `Active` (green), `Degraded` (yellow), `Error` (red)
- Quick stats: number of deployments, databases, domains
- "Open →" link → `/projects/[slug]/services`
- Owner badge if user is owner
- Hover: slight elevation, border highlight

**Empty state (no projects):**
- Large icon (folder)
- Headline: "No projects yet"
- Description: "A project groups your application, deployment, database, domain, and automation settings together."
- CTA: "Create your first project" button
- 4-step onboarding grid below CTA:
  1. Deploy applications — Connect a repository and deploy to your server
  2. Add a database — Provision PostgreSQL for your app
  3. Connect a domain — Point your domain at your deployment
  4. Set up automation — Create cron jobs and queued tasks

**Deleted projects toggle:**
- Eye icon in header with count badge
- Shows soft-deleted projects (recoverable for 30 days)
- "Purged after 30 days" note

**Developer & AI Access (collapsed by default):**
- Accordion section below the project grid
- Expand shows: key name, prefix, expiry, scopes, Create/Revoke buttons
- This is where the AI Control Center lives — collapsed to avoid premature API calls

### Create Project Modal

**Fields:**
- Project Name (required, max 100 chars, auto-generates slug)
- Slug (auto-generated from name, editable, lowercase, hyphens only)
- Description (optional, textarea)
- Project Icon (emoji picker — optional, default based on name)
- CTA: "Create Project"
- Cancel: closes modal

**Validation:**
- Slug must be unique
- Name cannot be "api", "www", "admin" (reserved)

### Project Detail Pages

All under `/projects/[slug]/`:

#### Services Overview (`/projects/[slug]/services`)

The project's home page. Shows all services configured for this project.

```
┌─────────────────────────────────────────────────────┐
│  ← Back to Projects                                 │
│                                                     │
│  My First Project                    [⚙ Settings]   │
│  ● Active · 3 deployments · 1 database              │
│                                                     │
│  ┌─ Deployment ────────────────────────────────┐    │
│  │ frontend    ● Running  · v1.2.3  · 6h ago   │    │
│  │ [Open deployment →]                          │    │
│  └──────────────────────────────────────────────┘    │
│  ┌─ Database ──────────────────────────────────┐    │
│  │ main-db    ● Online  · PostgreSQL 16  · 2GB  │    │
│  │ [Open database →]                            │    │
│  └──────────────────────────────────────────────┘    │
│  ┌─ Domain ────────────────────────────────────┐    │
│  │ api.example.com  ● Active  · TLS valid     │    │
│  └──────────────────────────────────────────────┘    │
│  ┌─ Functions ─────────────────────────────────┐    │
│  │ 3 functions · 0 errors                      │    │
│  └──────────────────────────────────────────────┘    │
│                                                     │
│  [+ Add Deployment] [+ Add Database] [+ Add Domain] │
└─────────────────────────────────────────────────────┘
```

Each service card shows:
- Service name
- Status badge (real-time, via WebSocket)
- Key metadata (version, size, etc.)
- "Open →" navigates to the service's full page

**Empty state for a service type:**
- Shows a "Connect [service]" card with a ➕ icon and "Set up your first [service]"

#### Project Settings (`/projects/[slug]/settings`)

**Tabs:**
1. **General** — name, description, slug, icon, delete project
2. **Members** — invite by email, assign roles (owner/admin/developer/viewer)
3. **API Keys** — project-level keys (`fpk_`), create/revoke
4. **Danger Zone** — delete project (requires typing project name)

### API Endpoints for Projects

| Method | Path | Description | Scope |
|--------|------|-------------|-------|
| GET | `/api/v1/projects` | List all projects | `projects:read` |
| POST | `/api/v1/projects` | Create project | `projects:write` |
| GET | `/api/v1/projects/:id` | Get project | `projects:read` |
| PATCH | `/api/v1/projects/:id` | Update project | `projects:write` |
| DELETE | `/api/v1/projects/:id` | Soft-delete project | `projects:delete` |
| POST | `/api/v1/projects/:id/restore` | Restore deleted project | `projects:write` |
| DELETE | `/api/v1/projects/:id/purge` | Permanently delete | `projects:delete` |
| GET | `/api/v1/projects/:id/members` | List members | `projects:read` |
| POST | `/api/v1/projects/:id/members` | Invite member | `projects:write` |
| PATCH | `/api/v1/projects/:id/members/:userId` | Update member role | `projects:write` |
| DELETE | `/api/v1/projects/:id/members/:userId` | Remove member | `projects:write` |
| GET | `/api/v1/projects/:id/api-keys` | List project keys | `projects:read` |
| POST | `/api/v1/projects/:id/api-keys` | Create project key | `projects:write` |
| DELETE | `/api/v1/projects/:id/api-keys/:keyId` | Revoke project key | `projects:write` |

### Data Model (Prisma)

```prisma
model Project {
  id          String   @id @default(cuid())
  name        String
  slug        String   @unique
  description String?
  icon        String?  // emoji
  status      ProjectStatus @default(ACTIVE)
  ownerId     String   @map("owner_id")
  createdAt   DateTime @default(now()) @map("created_at")
  updatedAt   DateTime @updatedAt @map("updated_at")
  deletedAt   DateTime? @map("deleted_at")

  owner       User     @relation(fields: [ownerId], references: [id])
  members     ProjectMember[]
  deployments Deployment[]
  databases   Database[]
  domains     Domain[]
  functions   Function[]
  queues      Queue[]
  cronJobs    CronJob[]
  storageBuckets StorageBucket[]
  // ...
}

model ProjectMember {
  id        String   @id @default(cuid())
  projectId String   @map("project_id")
  userId    String   @map("user_id")
  role      ProjectRole @default(DEVELOPER)
  createdAt DateTime @default(now())

  project   Project  @relation(fields: [projectId], references: [id], onDelete: Cascade)
  user      User     @relation(fields: [userId], references: [id])

  @@unique([projectId, userId])
}

enum ProjectStatus { ACTIVE DEGRADED ERROR }
enum ProjectRole { OWNER ADMIN DEVELOPER VIEWER }
```

### Role Permissions Matrix

| Action | Owner | Admin | Developer | Viewer |
|--------|-------|-------|-----------|--------|
| View project | ✓ | ✓ | ✓ | ✓ |
| Edit project | ✓ | ✓ | ✓ | ✗ |
| Delete project | ✓ | ✗ | ✗ | ✗ |
| Manage members | ✓ | ✓ | ✗ | ✗ |
| Create API keys | ✓ | ✓ | ✓ | ✗ |
| Revoke API keys | ✓ | ✓ | ✓ | ✗ |
| Deploy | ✓ | ✓ | ✓ | ✗ |
| Create database | ✓ | ✓ | ✓ | ✗ |
| Delete database | ✓ | ✓ | ✗ | ✗ |

---

## Part 7: Deployments

### Deployments List Page (`/deployments`)

Shows all deployments across all projects (global view).

**Table columns:**
- Name (linked to detail), Project (badge), Status, Version, Region/Server, Last deployed, Actions

**Status badges:**
- `● Running` (green)
- `⚠ Degraded` (yellow)
- `● Stopped` (grey)
- `✗ Error` (red)
- `⏸ Paused` (blue)

**Actions:**
- View logs
- Open shell
- Restart
- Stop/Start

**Filters:**
- By project (dropdown)
- By status (multi-select)
- By runtime (Node, Python, Go, Rust, PHP)

### Deployment Detail Page (`/projects/[slug]/deployments/[id]`)

**Tabs:**
1. **Overview** — status, version, URL, health, uptime, resource usage
2. **Logs** — real-time log stream, filter by level, search
3. **Shell** — web-based terminal (if supported)
4. **Settings** — environment variables, scaling, domain绑定

**Overview tab:**
- Large status indicator (animated for deploying)
- Deployment URL (clickable)
- Git commit SHA + branch
- Deployed at timestamp
- Resource usage: CPU%, Memory%, Disk%
- Health check status

**Environment variables:**
- Key-value table
- "Reveal values" toggle (shows `***` by default for sensitive vars)
- Add/edit/delete
- "Copy all as .env" button
- "Import from .env file"

### Create Deployment Flow

**Step 1: Choose source**
- Git repository (GitHub, GitLab, Bitbucket)
- Docker image (specify image URL)
- Upload archive (ZIP/TAR)

**Step 2: Configure**
- Project (dropdown)
- Name
- Runtime (Node, Python, Go, Rust, PHP, Static)
- Build command (optional, for Git source)
- Start command
- Port (default auto-detected)
- Health check path

**Step 3: Resources**
- Memory limit (slider: 128MB → 4GB)
- CPU (0.1 → 4 cores)
- Replicas (1-10)
- Auto-restart (toggle)

**Step 4: Domains (optional)**
- Add domain → creates DNS record automatically
- SSL certificate (Let's Encrypt, auto-provisioned)

**Step 5: Review & Deploy**
- Summary of all settings
- CTA: "Deploy"
- Progress: Building → Pushing → Starting → Healthy

### API Endpoints for Deployments

| Method | Path | Description | Scope |
|--------|------|-------------|-------|
| GET | `/api/v1/projects/:id/deployments` | List | `deployments:read` |
| POST | `/api/v1/projects/:id/deployments` | Create | `deployments:write` |
| GET | `/api/v1/projects/:id/deployments/:deploymentId` | Get | `deployments:read` |
| PATCH | `/api/v1/projects/:id/deployments/:deploymentId` | Update | `deployments:write` |
| DELETE | `/api/v1/projects/:id/deployments/:deploymentId` | Delete | `deployments:delete` |
| POST | `/api/v1/projects/:id/deployments/:deploymentId/deploy` | Redeploy | `deployments:write` |
| POST | `/api/v1/projects/:id/deployments/:deploymentId/restart` | Restart | `deployments:write` |
| POST | `/api/v1/projects/:id/deployments/:deploymentId/stop` | Stop | `deployments:write` |
| POST | `/api/v1/projects/:id/deployments/:deploymentId/start` | Start | `deployments:write` |
| GET | `/api/v1/projects/:id/deployments/:deploymentId/logs` | Stream logs | `deployments:read` |
| GET | `/api/v1/projects/:id/deployments/:deploymentId/health` | Health check | `deployments:read` |
| GET | `/api/v1/projects/:id/deployments/:deploymentId/metrics` | Resource metrics | `monitoring:read` |

### Data Model (Prisma)

```prisma
model Deployment {
  id          String   @id @default(cuid())
  projectId   String   @map("project_id")
  name        String
  slug        String
  status      DeploymentStatus @default(PENDING)
  runtime     String   // "node", "python", "go", etc.
  version     String?  // git SHA
  url         String?
  port        Int      @default(3000)
  envVars     Json     @default("{}")
  replicas    Int      @default(1)
  memoryLimit String   @default("512mb")
  cpuLimit    String   @default("0.5")
  createdAt   DateTime @default(now()) @map("created_at")
  updatedAt   DateTime @updatedAt @map("updated_at")

  project     Project  @relation(fields: [projectId], references: [id], onDelete: Cascade)
}

enum DeploymentStatus { PENDING BUILDING DEPLOYING RUNNING DEGRADED STOPPED ERROR }
```

---

## Part 8: Functions

### Functions List Page (`/projects/[slug]/functions`)

Shows all edge/serverless functions in a project.

**Table columns:**
- Name, Runtime (badge), Status, Invocations (today), Avg latency, Last invoked, Actions

**Runtime badges:**
- Node.js, Python, Go, Rust, PHP

**Actions:**
- Invoke (test with parameters)
- View logs
- Edit code
- Delete

### Function Detail Page (`/projects/[slug]/functions/[id]`)

**Tabs:**
1. **Code** — code editor (Monaco), read-only for non-editors
2. **Invocations** — invocation history table (timestamp, duration, status, request/response)
3. **Settings** — memory, timeout, environment variables

**Code tab:**
- Monaco editor (syntax highlighting, line numbers)
- "Save & Deploy" button
- Runtime selector
- Memory limit slider
- Timeout input (seconds)
- Environment variables section

### Create Function Modal

**Fields:**
- Name
- Runtime (dropdown: Node.js, Python, Go, Rust)
- Memory (slider)
- Timeout (seconds)
- Entry point (e.g., `index.handler` for Node, `main` for Go)

### API Endpoints for Functions

| Method | Path | Description | Scope |
|--------|------|-------------|-------|
| GET | `/api/v1/projects/:id/functions` | List | `functions:read` |
| POST | `/api/v1/projects/:id/functions` | Create | `functions:write` |
| GET | `/api/v1/projects/:id/functions/:fnId` | Get | `functions:read` |
| PATCH | `/api/v1/projects/:id/functions/:fnId` | Update | `functions:write` |
| DELETE | `/api/v1/projects/:id/functions/:fnId` | Delete | `functions:delete` |
| POST | `/api/v1/projects/:id/functions/:fnId/invoke` | Invoke | `functions:write` |
| GET | `/api/v1/projects/:id/functions/:fnId/invocations` | List invocations | `functions:read` |

---

## Part 9: Databases

### Databases List Page (`/projects/[slug]/databases`)

Shows all databases in a project.

**Table columns:**
- Name, Provider, Status, Version, Size, Region, Connections, Created, Actions

**Status badges:**
- `● Online` (green)
- `⚠ Degraded` (yellow) — replication lag
- `✗ Offline` (red)

**Actions:**
- Open adminer (in-app DB browser)
- View metrics
- Create replica
- Backup now
- Delete

### Database Detail Page (`/projects/[slug]/databases/[id]`)

**Tabs:**
1. **Overview** — status, version, size, connection string (masked), region, backup status
2. **Tables** — list of tables (via Adminer embedded)
3. **Backups** — list of backups with restore/download options
4. **Settings** — pool size, timeout, maintenance window

**Overview tab:**
- Connection string field (masked, click to reveal, one-click copy)
- "Open Adminer" button (opens in-app database browser)
- "Connect via CLI" snippet: `psql $CONNECTION_STRING`
- Disk usage chart
- Connection count (live)
- Backup schedule + last backup time

**Backups tab:**
- List: Backup name, Size, Created, Status
- Actions: Restore, Download (as SQL dump), Delete
- "Create backup now" button
- Retention policy display ("Kept for 7 days")

### Create Database Modal

**Fields:**
- Name (auto-generated from project name)
- Engine (PostgreSQL 16, PostgreSQL 17 — dropdown)
- Size (slider: 1GB → 100GB)
- Region (dropdown: same region as VPS)
- Backup retention (7, 14, 30 days)
- Extensions (multi-select: PostGIS, pgvector, pg_trgm, etc.)

### API Endpoints for Databases

| Method | Path | Description | Scope |
|--------|------|-------------|-------|
| GET | `/api/v1/projects/:id/databases` | List | `databases:read` |
| POST | `/api/v1/projects/:id/databases` | Create | `databases:write` |
| GET | `/api/v1/projects/:id/databases/:dbId` | Get | `databases:read` |
| PATCH | `/api/v1/projects/:id/databases/:dbId` | Update | `databases:write` |
| DELETE | `/api/v1/projects/:id/databases/:dbId` | Delete | `databases:delete` |
| GET | `/api/v1/projects/:id/databases/:dbId/backups` | List backups | `databases:read` |
| POST | `/api/v1/projects/:id/databases/:dbId/backups` | Create backup | `databases:write` |
| POST | `/api/v1/projects/:id/databases/:dbId/backups/:backupId/restore` | Restore | `databases:write` |
| GET | `/api/v1/projects/:id/databases/:dbId/metrics` | Metrics | `monitoring:read` |
| POST | `/api/v1/projects/:id/databases/:dbId/query` | Execute SQL (admin) | `databases:write` |

### Data Model (Prisma)

```prisma
model Database {
  id          String   @id @default(cuid())
  projectId   String   @map("project_id")
  name        String
  provider    String   @default("postgresql")
  version     String   @default("16")
  status      DbStatus @default(PROVISIONING)
  diskSizeGb  Int      @default(10)
  connectionLimit Int   @default(100)
  region      String?
  backupRetentionDays Int @default(7)
  createdAt   DateTime @default(now()) @map("created_at")
  updatedAt   DateTime @updatedAt @map("updated_at")

  project     Project  @relation(fields: [projectId], references: [id], onDelete: Cascade)
  backups     Backup[]
}

model Backup {
  id          String   @id @default(cuid())
  databaseId  String   @map("database_id")
  name        String
  sizeBytes   BigInt
  status      BackupStatus
  downloadedAt DateTime?
  expiresAt   DateTime
  createdAt   DateTime @default(now()) @map("created_at")

  database    Database @relation(fields: [databaseId], references: [id], onDelete: Cascade)
}

enum DbStatus { PROVISIONING RUNNING DEGRADED STOPPED }
enum BackupStatus { PENDING RUNNING COMPLETED FAILED }
```

---

## Part 10: Storage

### Storage List Page (`/projects/[slug]/storage`)

Shows all S3-compatible storage buckets in a project.

**Table columns:**
- Bucket name, Region, Objects (count), Size, Public/Private, Created, Actions

**Actions:**
- Open file browser
- View settings
- Generate presigned URL
- Delete

### Bucket Detail Page (`/projects/[slug]/storage/[bucketId]`)

**Tabs:**
1. **Files** — file browser (upload, download, delete, navigate folders)
2. **Settings** — ACL, CORS, lifecycle rules, static website hosting

**File browser:**
- Grid/list toggle
- Upload button (drag & drop + file picker)
- Folder navigation breadcrumbs
- Object: name, size, last modified, actions (download, copy URL, delete)
- "Generate presigned URL" with expiry selector

**Upload modal:**
- Drag & drop zone
- Multi-file support
- Destination folder
- Metadata (optional key-value pairs)

### Create Bucket Modal

**Fields:**
- Bucket name
- Region
- Public/Private (toggle)
- Versioning (toggle)
- Default encryption (AES256 / AWS-managed key)

### API Endpoints for Storage

| Method | Path | Description | Scope |
|--------|------|-------------|-------|
| GET | `/api/v1/projects/:id/storage` | List buckets | `storage:read` |
| POST | `/api/v1/projects/:id/storage` | Create bucket | `storage:write` |
| GET | `/api/v1/projects/:id/storage/:bucketId` | Get bucket | `storage:read` |
| DELETE | `/api/v1/projects/:id/storage/:bucketId` | Delete bucket | `storage:delete` |
| GET | `/api/v1/projects/:id/storage/:bucketId/objects` | List objects | `storage:read` |
| POST | `/api/v1/projects/:id/storage/:bucketId/objects/upload` | Upload object | `storage:write` |
| GET | `/api/v1/projects/:id/storage/:bucketId/objects/:path*` | Download object | `storage:read` |
| DELETE | `/api/v1/projects/:id/storage/:bucketId/objects/:path*` | Delete object | `storage:write` |
| POST | `/api/v1/projects/:id/storage/:bucketId/presign` | Generate presigned URL | `storage:write` |

---

## Part 11: Queues

### Queues List Page (`/projects/[slug]/queues`)

Shows all job queues in a project.

**Table columns:**
- Queue name, Pending jobs, Processing, Failed, Retries, Created, Actions

**Actions:**
- View jobs
- Pause queue
- Purge failed jobs
- Delete queue

### Queue Detail Page (`/projects/[slug]/queues/[queueId]`)

**Tabs:**
1. **Jobs** — live list of pending, processing, completed, failed jobs
2. **Workers** — active worker processes
3. **Settings** — concurrency, retry policy, dead-letter queue

**Jobs tab:**
- Real-time updates via WebSocket
- Filter by status (all/pending/processing/failed/completed)
- Job: ID, status badge, payload (collapsed JSON), attempts, created, completed
- Actions per job: Retry, Delete, View full payload

**Job detail modal:**
- Full JSON payload
- Attempt history (timestamp, worker ID, error message if failed)
- Retry button (with delay option)
- Delete button

### Create Queue Modal

**Fields:**
- Queue name
- Visibility timeout (seconds)
- Max retries (1-10)
- Retry delay (exponential backoff: fixed, linear, exponential)
- Dead-letter queue (optional, creates new queue for failed jobs)
- Retention period (hours)

### API Endpoints for Queues

| Method | Path | Description | Scope |
|--------|------|-------------|-------|
| GET | `/api/v1/projects/:id/queues` | List queues | `queues:read` |
| POST | `/api/v1/projects/:id/queues` | Create queue | `queues:write` |
| GET | `/api/v1/projects/:id/queues/:queueId` | Get queue | `queues:read` |
| DELETE | `/api/v1/projects/:id/queues/:queueId` | Delete queue | `queues:delete` |
| GET | `/api/v1/projects/:id/queues/:queueId/jobs` | List jobs | `queues:read` |
| POST | `/api/v1/projects/:id/queues/:queueId/jobs` | Enqueue job | `queues:write` |
| POST | `/api/v1/projects/:id/queues/:queueId/pause` | Pause queue | `queues:write` |
| POST | `/api/v1/projects/:id/queues/:queueId/resume` | Resume queue | `queues:write` |
| POST | `/api/v1/projects/:id/queues/:queueId/purge` | Purge failed jobs | `queues:write` |

---

## Part 12: Scheduler (Cron Jobs)

### Scheduler List Page (`/projects/[slug]/scheduler`)

Shows all cron jobs in a project.

**Table columns:**
- Name, Schedule (cron expression), Next run, Last run, Status, Actions

**Schedule column:** Shows both cron expression and human-readable ("Every 5 minutes", "Daily at midnight")

**Status badges:**
- `● Active` (green)
- `⏸ Paused` (grey)
- `⚠ Failing` (yellow — last run failed)

**Actions:**
- Run now (manual trigger)
- View runs (history)
- Pause/Resume
- Edit
- Delete

### Cron Job Detail Page (`/projects/[slug]/scheduler/[jobId]`)

**Tabs:**
1. **Overview** — schedule, next/last run, status, command
2. **Run History** — table of past runs with status, duration, output
3. **Settings** — schedule editor, timeout, retry policy, timezone

**Run history table:**
- Run ID, Started at, Completed at, Duration, Status (success/failed/timeout), Output (collapsed)

### Create Cron Job Modal

**Fields:**
- Name
- Command (textarea — the shell command to run)
- Schedule (cron expression with visual editor + presets: every minute, hourly, daily, weekly, monthly)
- Timeout (seconds, default 300)
- Retry on failure (toggle + retry count)
- Timezone (dropdown)
- Notification on failure (toggle — email/webhook)

**Presets:**
- Every minute: `* * * * *`
- Every 5 minutes: `*/5 * * * *`
- Hourly: `0 * * * *`
- Daily at midnight: `0 0 * * *`
- Weekly on Monday: `0 0 * * 1`
- Monthly on 1st: `0 0 1 * *`

### API Endpoints for Scheduler

| Method | Path | Description | Scope |
|--------|------|-------------|-------|
| GET | `/api/v1/projects/:id/cron` | List cron jobs | `cron:read` |
| POST | `/api/v1/projects/:id/cron` | Create cron job | `cron:write` |
| GET | `/api/v1/projects/:id/cron/:jobId` | Get cron job | `cron:read` |
| PATCH | `/api/v1/projects/:id/cron/:jobId` | Update cron job | `cron:write` |
| DELETE | `/api/v1/projects/:id/cron/:jobId` | Delete cron job | `cron:delete` |
| POST | `/api/v1/projects/:id/cron/:jobId/run` | Run now | `cron:write` |
| POST | `/api/v1/projects/:id/cron/:jobId/pause` | Pause | `cron:write` |
| POST | `/api/v1/projects/:id/cron/:jobId/resume` | Resume | `cron:write` |
| GET | `/api/v1/projects/:id/cron/:jobId/runs` | Run history | `cron:read` |

---

## Part 13: Email

### Email Domains List Page (`/projects/[slug]/email/domains`)

**Table columns:**
- Domain, Status (verification), DKIM, SPF, DMARC, Created, Actions

**Status indicators:**
- `✓ Verified` (green)
- `○ Pending` (yellow — needs DNS verification)
- `✗ Failed` (red)

**Actions:**
- Set up DNS (shows required records)
- Verify domain
- View DNS records
- Delete domain

### Email Domain Setup Page (`/projects/[slug]/email/domains/[domainId]/setup`)

Shows the DNS records needed to verify the domain and configure email sending.

**Required DNS records table:**
| Type | Name | Value | Purpose |
|------|------|-------|---------|
| TXT | `_dmarc` | `v=DMARC1; p=quarantine; rua=mailto:dmarc@...` | DMARC |
| TXT | `dkim._domainkey` | `v=DKIM1; k=rsa; p=...` | DKIM |
| MX | `@` | `mail.fidscript.com` | Inbound mail |
| TXT | `@` | `v=spf1 include:_spf.fidscript.com ~all` | SPF |

Each record shows:
- Current value (if already set)
- Required value
- Status: ✓ Match, ✗ Mismatch, ○ Not set

**Auto-setup button:** If the domain's DNS is managed by Cloudflare (connected), auto-apply records.

### Mailboxes List Page (`/projects/[slug]/email/mailboxes`)

**Table columns:**
- Address, Name, Quota (used/total), Messages (unread), Created, Actions

**Actions:**
- Open mailbox (in-app email client — Stalwart webmail)
- Edit settings
- Delete mailbox

**Create mailbox modal:**
- Address (local part @ domain)
- Display name
- Quota (MB)
- Password (or generate random)

### Email Send Page (`/projects/[slug]/email/send`)

In-app email composer for transactional emails.

**Fields:**
- From (pre-filled with project's default mailbox)
- To (email input, supports multiple)
- Subject
- Body (rich text editor with markdown support)
- Attachments (file picker)
- Preview (toggle to see HTML rendering)

**Templates section (sidebar):**
- List of saved templates
- "Insert template" inserts into body
- Create from current email

### API Endpoints for Email

| Method | Path | Description | Scope |
|--------|------|-------------|-------|
| GET | `/api/v1/projects/:id/email/domains` | List domains | `email:read` |
| POST | `/api/v1/projects/:id/email/domains` | Add domain | `email:write` |
| DELETE | `/api/v1/projects/:id/email/domains/:domainId` | Remove domain | `email:write` |
| POST | `/api/v1/projects/:id/email/domains/:domainId/verify` | Verify DNS | `email:write` |
| GET | `/api/v1/projects/:id/email/domains/:domainId/records` | Get DNS records needed | `email:read` |
| GET | `/api/v1/projects/:id/email/mailboxes` | List mailboxes | `email:read` |
| POST | `/api/v1/projects/:id/email/mailboxes` | Create mailbox | `email:write` |
| GET | `/api/v1/projects/:id/email/mailboxes/:mboxId` | Get mailbox | `email:read` |
| DELETE | `/api/v1/projects/:id/email/mailboxes/:mboxId` | Delete mailbox | `email:write` |
| GET | `/api/v1/projects/:id/email/messages` | List messages | `email:read` |
| POST | `/api/v1/projects/:id/email/send` | Send email | `email:send` |
| GET | `/api/v1/projects/:id/email/templates` | List templates | `email:read` |
| POST | `/api/v1/projects/:id/email/templates` | Create template | `email:write` |

---

## Part 14: Domains

### Domains List Page (`/domains`)

Global view of all domains across all projects.

**Table columns:**
- Domain, Type (apex/subdomain), Project, SSL status, DNS status, Created, Actions

**SSL status badges:**
- `✓ Valid` (green, shows expiry date)
- `⚠ Expiring soon` (yellow, < 30 days)
- `✗ Invalid` (red)
- `○ Pending` (yellow — ACME in progress)

**Actions:**
- View DNS records
- Set up SSL
- Manage Cloudflare (if connected)
- Delete

### Domain Detail Page (`/domains/[domainId]`)

**Tabs:**
1. **Overview** — domain, type, project, registrar, NS servers, SSL
2. **DNS Records** — zone file editor
3. **SSL Certificates** — active cert, renewal, ACME setup
4. **Connections** — which deployments/domains use this domain
5. **Settings** — TTL, DNSSEC, transfer lock

**DNS Records tab:**
- Table: Type, Name, Content, TTL, Priority (for MX)
- Add record modal (Type, Name, Content, TTL)
- Import zone file (paste zone file content)
- Export zone file

**SSL tab:**
- Current certificate: issuer, valid from/to, SANs
- Auto-renewal toggle (enabled by default)
- "Renew now" button
- ACME provider: Let's Encrypt (default)
- Challenge method: DNS-01 (for wildcard certs)

### Add Domain Flow

**Step 1: Choose type**
- Apex domain (e.g., `example.com`)
- Subdomain (e.g., `api.example.com`)

**Step 2: Connect DNS**
- Option A: Transfer DNS to FIDScript (Cloudflare API integration — FIDScript manages DNS)
- Option B: Add records manually (show required records for verification + SSL)

**Step 3: Verify**
- FIDScript polls DNS for TXT record verification
- Status: Pending → Verified

### API Endpoints for Domains

| Method | Path | Description | Scope |
|--------|------|-------------|-------|
| GET | `/api/v1/projects/:id/domains` | List | `domains:read` |
| POST | `/api/v1/projects/:id/domains` | Add domain | `domains:write` |
| GET | `/api/v1/projects/:id/domains/:domainId` | Get | `domains:read` |
| DELETE | `/api/v1/projects/:id/domains/:domainId` | Delete | `domains:delete` |
| GET | `/api/v1/projects/:id/domains/:domainId/records` | List DNS records | `domains:read` |
| POST | `/api/v1/projects/:id/domains/:domainId/records` | Add record | `domains:write` |
| PATCH | `/api/v1/projects/:id/domains/:domainId/records/:recordId` | Update record | `domains:write` |
| DELETE | `/api/v1/projects/:id/domains/:domainId/records/:recordId` | Delete record | `domains:write` |
| POST | `/api/v1/projects/:id/domains/:domainId/verify` | Verify domain | `domains:write` |
| GET | `/api/v1/projects/:id/domains/:domainId/ssl` | Get SSL status | `domains:read` |
| POST | `/api/v1/projects/:id/domains/:domainId/ssl/renew` | Renew SSL | `domains:write` |

---

## Part 15: Monitoring

### Monitoring Overview Page (`/projects/[slug]/monitoring`)

**Metrics grid (real-time):**
- CPU Usage (current %)
- Memory Usage (current %)
- Disk I/O (read/write MB/s)
- Network (in/out KB/s)
- Deployment count
- Error rate (%)

Each metric card shows:
- Current value (large number)
- Sparkline (last 1 hour)
- Trend arrow (↑ ↓ →)
- Time range selector (1h, 6h, 24h, 7d, 30d)

**Deployments health table:**
- Deployment name, Status, CPU%, Memory%, Uptime, Errors (today)

**Alerts panel:**
- Active alerts list
- "No active alerts" empty state

### Alert Rules Page (`/projects/[slug]/monitoring/alerts`)

**Alert rule table:**
- Name, Metric, Condition, Threshold, Cooldown, Status, Actions

**Alert conditions:**
- CPU > X% for Y minutes
- Memory > X% for Y minutes
- Disk > X% for Y minutes
- Deployment down for X minutes
- Error rate > X% for Y minutes
- Custom query

**Notification channels:**
- Email
- Webhook (POST to URL)
- Slack (via webhook)
- PagerDuty (via integration key)

**Alert rule editor:**
- Name
- Condition (metric + operator + threshold + duration)
- Notification channel (multi-select)
- Auto-resolve toggle

### API Endpoints for Monitoring

| Method | Path | Description | Scope |
|--------|------|-------------|-------|
| GET | `/api/v1/projects/:id/monitoring/metrics` | Get metrics | `monitoring:read` |
| GET | `/api/v1/projects/:id/monitoring/metrics/:metric` | Get specific metric | `monitoring:read` |
| GET | `/api/v1/projects/:id/monitoring/alerts` | List alert rules | `monitoring:read` |
| POST | `/api/v1/projects/:id/monitoring/alerts` | Create alert rule | `monitoring:write` |
| PATCH | `/api/v1/projects/:id/monitoring/alerts/:alertId` | Update alert rule | `monitoring:write` |
| DELETE | `/api/v1/projects/:id/monitoring/alerts/:alertId` | Delete alert rule | `monitoring:write` |
| GET | `/api/v1/projects/:id/monitoring/alerts/:alertId/history` | Alert history | `monitoring:read` |
| GET | `/api/v1/projects/:id/monitoring/notification-channels` | List channels | `monitoring:read` |
| POST | `/api/v1/projects/:id/monitoring/notification-channels` | Create channel | `monitoring:write` |
| DELETE | `/api/v1/projects/:id/monitoring/notification-channels/:channelId` | Delete channel | `monitoring:write` |

---

## Part 16: Logs

### Logs Page (`/projects/[slug]/logs`)

**Real-time log stream:**
- WebSocket-powered live log viewer
- Filter by:
  - Service (deployment, function, queue worker, cron, all)
  - Level (debug, info, warn, error, fatal)
  - Time range (last 15m, 1h, 6h, 24h, custom)
- Search (full-text, regex toggle)
- Pause/resume stream

**Log entry format:**
```
[2026-08-20 14:32:01] [INFO] [deployment.frontend] Container started on port 3000
```
Fields: timestamp, level badge (color-coded), service name, message

**Log entry detail (click to expand):**
- Full JSON payload
- Trace ID (clickable — links to distributed trace if available)
- Copy as JSON button

**Saved searches:**
- Save current filter as a named search
- Quick-access chips for saved searches

### API Endpoints for Logs

| Method | Path | Description | Scope |
|--------|------|-------------|-------|
| GET | `/api/v1/projects/:id/logs` | Query logs | `logs:read` |
| GET | `/api/v1/projects/:id/logs/stream` | SSE log stream | `logs:read` |
| POST | `/api/v1/logs/ingest` | Ingest external logs | (account-level, no project) |

---

## Part 17: Realtime (WebSocket)

### Realtime Settings Page (`/projects/[slug]/realtime`)

**Channel management:**
- List of channels (e.g., `project-{id}`, `deployment-{id}`)
- Connection count per channel
- "Open debugger" (dev tool showing live events)

**Presence:**
- List of connected users with name, avatar, last seen
- "Send test event" button (dev tool)

### API Endpoints for Realtime

| Method | Path | Description | Scope |
|--------|------|-------------|-------|
| GET | `/api/v1/projects/:id/realtime/channels` | List channels | `realtime:read` |
| POST | `/api/v1/projects/:id/realtime/setPresence` | Set user presence | `realtime:write` |
| GET | `/api/v1/projects/:id/realtime/presence` | Get presence | `realtime:read` |

---

## Part 18: MCP Server

### MCP Setup Page (`/mcp`)

**Purpose:** Configure the MCP server for AI agent integration.

**Section 1: MCP Server Status**
- Server URL: `https://api.deploy.fidscript.com/mcp`
- Status indicator (connected/disconnected)
- Server version

**Section 2: Authentication**
- API Key dropdown (shows all `fsk_` keys)
- Selected key's granted scopes
- "Generate new key" button → opens `/settings/api-keys`

**Section 3: Connection Instructions**
Three ways to connect:

**A. Claude Desktop (Mac/Windows):**
```json
{
  "mcpServers": {
    "fidscript": {
      "command": "npx",
      "args": ["-y", "@fidscript-deploy/mcp-server"],
      "env": {
        "FIDSCRIPT_API_KEY": "fsk_...",
        "FIDSCRIPT_API_URL": "https://api.deploy.fidscript.com"
      }
    }
  }
}
```

**B. VS Code Copilot:**
Same JSON in VS Code settings

**C. Custom AI Agent:**
```ts
import { createFidscript } from '@fidscript-deploy/sdk';
const sdk = createFidscript({
  apiKey: 'fsk_...',
  baseURL: 'https://api.deploy.fidscript.com'
});
```

**Section 4: Available Tools**
Table of all MCP tools with their descriptions, grouped by service.

**Section 5: AI Agent Instructions**
- Read-only textarea with generated instructions for the AI
- Instructions include: granted scopes, API URL, two-key model explanation
- Copy button

### API Endpoints for MCP

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/mcp/tools` | List all MCP tools |
| POST | `/api/v1/mcp/execute` | Execute MCP tool |

---

## Part 19: Marketplace

### Marketplace Page (`/marketplace`)

**Purpose:** Discover and install templates (starter projects, boilerplates, full applications).

**Template categories:**
- All
- Starter Kit
- CMS
- E-commerce
- SaaS Boilerplate
- Database
- Monitoring

**Template card:**
- Name
- Category badge
- Description (2 lines max)
- Author
- Install count
- Rating (stars)
- "Install" button

**Template detail modal:**
- Full description
- Screenshots (carousel)
- Features list
- Requirements
- License
- "Install [Template Name]" CTA

**Installed templates section:**
- List of templates installed on this platform
- "Open" or "Manage" per template

### API Endpoints for Marketplace

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/marketplace/templates` | List templates |
| GET | `/api/v1/marketplace/templates/:templateId` | Get template detail |
| POST | `/api/v1/marketplace/templates/:templateId/install` | Install template |

---

## Part 20: Settings (Global)

### Global Settings Page (`/settings`)

**Tabs:**
1. **Account** — email, name, password, avatar, delete account
2. **API Keys** — all `fsk_` keys across the account
3. **Organization** — org name, logo, members, roles
4. **Billing** — (placeholder — "Billing is managed externally")
5. **Notifications** — email preferences for alerts
6. **Security** — active sessions, trusted devices, 2FA

### Account Tab

**Fields:**
- Avatar (upload image)
- Display name
- Email (read-only, or change flow with verification)
- Password (change: current + new + confirm)
- "Delete account" (danger zone, requires typing "DELETE")

### API Keys Tab

See Account API Keys section above (same page).

### Sessions Tab

**Active sessions table:**
- Device (icon + browser/OS), IP address, Location (geo-IP), Last active, Current (badge)
- Actions: Revoke, Revoke all other sessions

### Security Tab

**Two-factor authentication:**
- TOTP app setup (show QR code, enter code to verify)
- Backup codes (show/re-generate)
- 2FA status badge

---

## Part 21: Design System

### Color Palette (CSS Variables)

```css
:root {
  /* Text */
  --text: #f0f0f0;
  --text-muted: #a0a0a0;
  --text-dim: #606060;

  /* Surfaces */
  --surface: #0a0a0a;
  --surface-2: #141414;
  --surface-3: #1e1e1e;
  --rail: #2a2a2a;

  /* Brand */
  --primary: #6366f1;      /* Indigo */
  --primary-hover: #818cf8;
  --accent: #22c55e;        /* Green — used for CTAs */

  /* Status */
  --success: #22c55e;
  --warning: #f59e0b;
  --error: #ef4444;
  --info: #3b82f6;

  /* Semantic */
  --success-bg: rgba(34, 197, 94, 0.1);
  --warning-bg: rgba(245, 158, 11, 0.1);
  --error-bg: rgba(239, 68, 68, 0.1);
  --info-bg: rgba(59, 130, 246, 0.1);
}
```

### Typography

- **Font family:** `"Inter", system-ui, -apple-system, sans-serif`
- **Monospace:** `"JetBrains Mono", "Fira Code", monospace`
- **Scale:** 12px / 13px / 14px / 16px / 18px / 20px / 24px / 30px / 36px / 48px
- **Weights:** 400 (normal), 500 (medium), 600 (semibold), 700 (bold)

### Spacing

- Base unit: 4px
- Spacing scale: 4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80, 96

### Border Radius

- Small (inputs, badges): 6px
- Medium (cards, buttons): 8px
- Large (modals, panels): 12px
- Full (avatars): 9999px

### Shadows

- Card: `0 1px 3px rgba(0,0,0,0.4), 0 1px 2px rgba(0,0,0,0.6)`
- Modal: `0 20px 40px rgba(0,0,0,0.6)`
- Dropdown: `0 4px 12px rgba(0,0,0,0.5)`

### Component Specifications

#### Button

| Variant | Background | Text | Border |
|---------|-----------|------|--------|
| Primary | `var(--accent)` | `var(--surface)` | none |
| Secondary | `var(--surface-2)` | `var(--text)` | `var(--rail)` |
| Ghost | transparent | `var(--text-muted)` | none |
| Danger | `var(--error)` | white | none |

**Sizes:** `sm` (h-28, px-3, text-xs), `md` (h-36, px-4, text-sm), `lg` (h-44, px-6, text-base)

**States:** Default, Hover (opacity-90), Active (scale-98), Disabled (opacity-50, cursor-not-allowed), Loading (spinner replaces icon)

#### Input

- Background: `var(--surface-2)`
- Border: `var(--rail)`, on focus: `var(--primary)`
- Text: `var(--text)`
- Placeholder: `var(--text-dim)`
- Height: 36px (sm), 40px (md), 48px (lg)
- Error state: border `var(--error)`, helper text below in red

#### Card

- Background: `var(--surface)`
- Border: 1px solid `var(--rail)`
- Border radius: 8px
- Padding: 16px (compact), 24px (normal)
- Hover (if interactive): border brightens to `var(--text-dim)`

#### Badge / Status Chip

- Small: h-5, px-2, text-xs, rounded-full
- Dot indicator + text
- Colors mapped to status: green/red/yellow/grey/blue

#### Data Table

- Header: `var(--surface-2)`, text-xs, uppercase, letter-spacing-wide
- Row: `var(--surface)`, hover `var(--surface-2)`
- Border: 1px solid `var(--rail)` between rows
- Pagination bar at bottom
- Empty state: centered icon + message
- Loading state: skeleton rows

#### Modal / Dialog

- Overlay: `rgba(0,0,0,0.7)`, backdrop-blur-sm
- Modal: `var(--surface)`, border `var(--rail)`, radius 12px, max-width 480px (sm), 640px (md), 800px (lg)
- Header: title + close button
- Footer: action buttons, right-aligned

#### Toast / Notification

- Position: bottom-right
- Types: success (green), error (red), warning (yellow), info (blue)
- Auto-dismiss: 5s (success/info), 8s (warning), manual (error)
- Stack: max 3 visible, older ones queue

#### Accordion / Collapsible

- Chevron icon rotates 90° on open
- Smooth height animation (300ms ease)
- Border around content when open

#### Empty State

- Centered vertically
- Large muted icon (64x64)
- Headline (text-lg, semibold)
- Description (text-sm, muted)
- Optional CTA button

---

## Part 22: Component Catalog (Reusable)

### Layout Components

| Component | Description | Props |
|-----------|-------------|-------|
| `AppShell` | Main layout wrapper: sidebar + topbar + content | `sidebarOpen`, `onSidebarToggle` |
| `Sidebar` | Left navigation | `open`, `activeItem` |
| `TopBar` | Global search, notifications, account menu | `onMenuToggle` |
| `PageHeader` | Title + subtitle + actions row | `title`, `subtitle`, `actions` |
| `ContentPanel` | Content area within page | `children` |

### Navigation Components

| Component | Description |
|-----------|-------------|
| `Breadcrumb` | Path: Projects > My Project > Deployments |
| `TabNav` | Horizontal tab navigation |
| `StatusBadge` | Colored badge for status indicators |
| `RoleBadge` | OWNER / ADMIN / DEVELOPER / VIEWER |
| `CountBadge` | Notification count bubble |

### Data Components

| Component | Description |
|-----------|-------------|
| `DataTable` | Sortable, filterable, paginated table |
| `StatCard` | Single metric with label + sparkline |
| `MetricGrid` | Grid of `StatCard` components |
| `LogStream` | Real-time log viewer component |
| `LogEntry` | Single log line with expand |

### Form Components

| Component | Description |
|-----------|-------------|
| `Input` | Text input with label + error |
| `Textarea` | Multi-line input |
| `Select` | Dropdown select |
| `MultiSelect` | Multi-select chips |
| `Toggle` | On/off switch |
| `Slider` | Range slider (for sizes, limits) |
| `Checkbox` | Single checkbox |
| `RadioGroup` | Radio button group |
| `DatePicker` | Date input with calendar |
| `FileUpload` | Drag & drop file zone |

### Feedback Components

| Component | Description |
|-----------|-------------|
| `Button` | Primary/secondary/ghost/danger |
| `Modal` | Dialog with overlay |
| `Drawer` | Slide-in panel from right |
| `Toast` | Notification toast |
| `Spinner` | Loading indicator |
| `Skeleton` | Loading placeholder (text, card, table rows) |
| `EmptyState` | Icon + message + CTA for empty lists |
| `ErrorState` | Error icon + message + retry button |

### Specialized Components

| Component | Description |
|-----------|-------------|
| `CronEditor` | Visual cron expression editor |
| `EnvVarTable` | Key-value table for environment variables |
| `LogFilter` | Filter controls for log stream |
| `MetricChart` | Time-series chart (uses Recharts) |
| `DnsRecordEditor` | DNS zone file editor |
| `MonacoEditor` | Code editor for functions/config |
| `JsonViewer` | Collapsible JSON tree |
| `WebhookTester` | Test webhook with sample payload |

---

## Part 23: Technical Architecture

### Stack

- **Framework:** Next.js 14+ (App Router)
- **Language:** TypeScript (strict mode, no `any`)
- **Styling:** Tailwind CSS + CSS variables for theming
- **Icons:** Hugeicons (NOT Lucide, NOT Heroicons — Hugeicons only)
- **State:** React Context for auth, TanStack Query for server state
- **Forms:** React Hook Form + Zod
- **HTTP client:** Axios (via SDK)
- **Charts:** Recharts (for metrics)
- **Code editor:** Monaco Editor (for functions/config)
- **Email rendering:** React Email (for email templates)

### File Structure

```
apps/dashboard/src/
├── app/
│   ├── (public)/              # Public routes (no auth)
│   │   ├── page.tsx           # Landing page
│   │   ├── login/
│   │   └── register/
│   ├── (auth)/                # Auth-required routes
│   │   ├── layout.tsx        # AppShell with sidebar
│   │   ├── projects/
│   │   │   ├── page.tsx                    # Projects list
│   │   │   └── [slug]/
│   │   │       ├── services/page.tsx
│   │   │       ├── deployments/[id]/page.tsx
│   │   │       ├── functions/[id]/page.tsx
│   │   │       ├── databases/[id]/page.tsx
│   │   │       ├── storage/[id]/page.tsx
│   │   │       ├── queues/[id]/page.tsx
│   │   │       ├── scheduler/[id]/page.tsx
│   │   │       ├── email/domains/[id]/page.tsx
│   │   │       ├── email/mailboxes/[id]/page.tsx
│   │   │       ├── email/send/page.tsx
│   │   │       ├── monitoring/page.tsx
│   │   │       ├── monitoring/alerts/page.tsx
│   │   │       ├── logs/page.tsx
│   │   │       ├── realtime/page.tsx
│   │   │       └── settings/page.tsx
│   │   ├── deployments/page.tsx            # Global deployments
│   │   ├── domains/page.tsx                 # Global domains
│   │   ├── mcp/page.tsx
│   │   ├── marketplace/page.tsx
│   │   └── settings/
│   │       ├── page.tsx                      # Global settings
│   │       └── api-keys/page.tsx
│   ├── setup/                               # Installation wizard
│   ├── onboarding/                          # Post-install onboarding
│   └── api/
│       └── v1/
│           └── [...path]/route.ts           # API proxy
├── components/
│   ├── ui/                   # Generic UI components
│   │   ├── button.ts
│   │   ├── input.ts
│   │   ├── card.ts
│   │   ├── badge.ts
│   │   ├── modal.ts
│   │   ├── table.ts
│   │   ├── tabs.ts
│   │   ├── select.ts
│   │   ├── toggle.ts
│   │   ├── skeleton.ts
│   │   ├── toast.tsx
│   │   └── empty-state.tsx
│   ├── layout/               # Layout components
│   │   ├── app-shell.tsx
│   │   ├── sidebar.tsx
│   │   ├── topbar.tsx
│   │   └── page-header.tsx
│   ├── forms/                # Form components
│   │   ├── create-project-form.tsx
│   │   ├── create-deployment-form.tsx
│   │   ├── create-database-form.tsx
│   │   ├── env-var-editor.tsx
│   │   └── cron-editor.tsx
│   └── domain-specific/      # Per-service components
│       ├── project-card.tsx
│       ├── deployment-card.tsx
│       ├── log-stream.tsx
│       ├── metric-grid.tsx
│       └── status-badge.tsx
├── hooks/
│   ├── use-auth.ts
│   ├── use-account-credentials.ts   # AI Control Center hook
│   ├── use-projects.ts
│   ├── use-deployments.ts
│   ├── use-databases.ts
│   └── ... (one hook per service)
├── lib/
│   ├── sdk.ts                 # SDK factory
│   └── utils.ts               # General utilities
├── contexts/
│   ├── auth-context.tsx       # Auth state + methods
│   └── toast-context.tsx      # Toast notifications
└── styles/
    └── globals.css            # CSS variables + base styles
```

### Routing Rules

- **`/projects` (auth required)** — Project list, `owner/admin/developer` can create
- **`/projects/[slug]` (auth required)** — Project detail, must be member
- **`/projects/[slug]/[service]/[id]` (auth required)** — Service detail, role-gated actions
- **`/deployments` (auth required)** — Global deployments list
- **`/domains` (auth required)** — Global domains list (admins only for create/delete)
- **`/mcp` (auth required)** — MCP setup
- **`/marketplace` (auth required)** — Template marketplace
- **`/settings` (auth required)** — Account settings

### Authentication Flow

1. User visits any protected route
2. Middleware checks for `fidscript_access_token` in `localStorage`
3. If token exists: validate with `GET /api/v1/auth/me`
   - Success: populate auth context, render page
   - 401: try refresh with `fidscript_refresh_token`
     - Refresh success: update tokens, re-validate
     - Refresh fail: redirect to `/login`
4. If no token: redirect to `/login?next=/original-path`

### API Proxy

All dashboard API calls go through `/api/v1/*` (Next.js proxy route) → `http://fidscript_api:3001/api/v1/*`

The proxy:
- Forwards the Authorization header
- Adds CORS headers for `https://deploy.fidscript.com`
- Streams responses (SSE) without buffering

### Real-time Updates

- Log streams: SSE via `/api/v1/projects/:id/logs/stream`
- Deployment status: SSE via `/api/v1/projects/:id/deployments/:id/health`
- Realtime presence: WebSocket (Socket.IO)
- Alert notifications: SSE (same channel as logs)

### Error Handling

**Per-page error boundaries:**
- Catch errors in page component
- Show `ErrorState` with error message + "Retry" button
- Log error to monitoring (if available)

**Per-action error handling:**
- API errors shown as toast (not page-level error)
- Validation errors shown inline below the relevant field
- Network errors: "Unable to connect. Check your connection."

**Global error handler:**
- Uncaught exceptions: show full-screen error with stack trace (dev only) or generic error (prod)

---

## Part 24: API Integration Contract

### SDK Usage Pattern

```typescript
// SDK is always accessed via useAuth().getSdk()
const { getSdk } = useAuth();

// Projects
const projects = await getSdk().projects.list();
const project = await getSdk().projects.get(projectId);
await getSdk().projects.create({ name, slug, description });

// Deployments
await getSdk().deployments.create(projectId, { name, runtime, port });
await getSdk().deployments.deploy(projectId, deploymentId);
await getSdk().deployments.restart(projectId, deploymentId);
const logs = await getSdk().deployments.getLogs(projectId, deploymentId);

// Databases
await getSdk().databases.create(projectId, { name, diskSizeGb });
const backups = await getSdk().databases.listBackups(projectId, dbId);
await getSdk().databases.restoreBackup(projectId, dbId, backupId);

// Queues
await getSdk().queues.create(projectId, { name, maxRetries });
await getSdk().queues.enqueue(projectId, queueId, { job: 'data', payload });

// Cron
await getSdk().cron.create(projectId, { name, command, schedule });
await getSdk().cron.run(projectId, jobId); // manual trigger

// Email
await getSdk().email.send(projectId, { to, subject, body });
const messages = await getSdk().email.listMessages(projectId);

// Auth (account-level)
await getSdk().auth.createApiKey({ name, scopes });
const { items } = await getSdk().auth.apiKeys();
await getSdk().auth.revokeApiKey(keyId);
```

### SDK Methods — Full List

| Module | Method | Signature |
|--------|--------|-----------|
| auth | login | `(email, password) => AuthResponse` |
| auth | register | `(email, password, name) => AuthResponse` |
| auth | me | `() => User` |
| auth | logout | `() => void` |
| auth | refreshToken | `(refreshToken) => AuthResponse` |
| auth | apiKeys | `() => { items: ApiKey[] }` |
| auth | createApiKey | `({ name, scopes? }) => { ...key }` |
| auth | revokeApiKey | `(keyId) => void` |
| projects | list | `() => Project[]` |
| projects | get | `(id) => Project` |
| projects | create | `(data) => Project` |
| projects | update | `(id, data) => Project` |
| projects | delete | `(id) => void` |
| projects | members | `(id) => ProjectMember[]` |
| projects | invite | `(id, email, role) => void` |
| deployments | list | `(projectId) => Deployment[]` |
| deployments | get | `(projectId, id) => Deployment` |
| deployments | create | `(projectId, data) => Deployment` |
| deployments | deploy | `(projectId, id) => void` |
| deployments | restart | `(projectId, id) => void` |
| deployments | stop | `(projectId, id) => void` |
| deployments | getLogs | `(projectId, id, filter?) => LogEntry[]` |
| functions | list | `(projectId) => Function[]` |
| functions | invoke | `(projectId, id, payload) => any` |
| databases | list | `(projectId) => Database[]` |
| databases | backups | `(projectId, id) => Backup[]` |
| queues | list | `(projectId) => Queue[]` |
| queues | enqueue | `(projectId, id, job) => Job` |
| queues | getJobs | `(projectId, id, filter?) => Job[]` |
| cron | list | `(projectId) => CronJob[]` |
| cron | run | `(projectId, id) => void` |
| email | domains | `() => EmailDomain[]` |
| email | send | `(projectId, data) => void` |
| domains | list | `(projectId) => Domain[]` |
| domains | records | `(projectId, id) => DnsRecord[]` |
| monitoring | metrics | `(projectId) => Metrics` |
| monitoring | alerts | `(projectId) => Alert[]` |

---

## Part 25: File Naming Conventions

Every file name follows: `[domain]-[action]-[type].ts`

| Pattern | Example | What goes in |
|---------|---------|--------------|
| `[domain]-card.tsx` | `project-card.tsx` | Card component for a project |
| `[domain]-list.tsx` | `deployment-list.tsx` | List page for deployments |
| `[domain]-detail.tsx` | `database-detail.tsx` | Detail page |
| `[domain]-form.tsx` | `create-deployment-form.tsx` | Form/modal for creating |
| `[domain]-service.ts` | `auth-service.ts` | Business logic (not in components) |
| `[domain]-hooks.ts` | `use-deployments.ts` | Custom hook |

**Forbidden file names:**
- `helpers.ts` — does not exist
- `common.ts` — does not exist
- `utils.ts` — does not exist
- `tools.ts` — does not exist
- `index.ts` (in src/) — never barrel-export everything

---

## Part 26: Acceptance Criteria

A page is **done** when:
1. It renders the correct entity data from the API
2. All buttons call the correct API endpoints
3. Role-based rendering is correct (viewers don't see edit buttons)
4. Empty states explain what to do
5. Error states are handled gracefully (toast for API errors, error boundary for crashes)
6. Loading states show skeletons (not spinners)
7. No `any` types
8. No business logic in components (all in hooks/services)
9. 150-line limit per file respected
10. `tsc --noEmit` passes
