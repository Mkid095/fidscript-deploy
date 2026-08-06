<div align="center">
<img width="1200" height="475" alt="FIDScript Deploy" src="https://fidscript.dev/banner.png" />
</div>

# FIDScript Deploy

**A self-hosted Developer Operating System**

FIDScript Deploy turns any VPS into a private application cloud — hosting, authentication, storage, databases, queues, cron jobs, email, realtime infrastructure, AI integration, and MCP-native platform management — all behind one domain, one dashboard, one CLI. Built as a single Docker Compose stack you install once with `curl | bash`.

[![Version](https://img.shields.io/badge/version-1.0.0--alpha-red?style=for-the-badge)](https://fidscript.dev)
[![Status](https://img.shields.io/badge/status-Phase%2001%20(Installer%20Verified)-orange?style=for-the-badge)](./docs/phases/phase-01.md)
[![License](https://img.shields.io/badge/license-MIT-blue?style=for-the-badge)](LICENSE)

---

## ✨ Features

- **Application Hosting** — Deploy frontend, backend, worker, and static apps with Docker + Traefik
- **Managed Databases** — PostgreSQL with automated backups and connection pooling (pgbouncer)
- **Realtime Infrastructure** — NATS-powered event bus, JetStream queues, and websocket channels
- **Email Platform** — Stalwart SMTP/JMAP server with DKIM-ready config and webhook integration
- **Object Storage** — S3-compatible MinIO with multi-cloud adapters
- **Serverless Functions** — Deploy and invoke functions with isolated execution
- **Cron Scheduler** — Managed cron jobs with execution history
- **Authentication** — User management, roles, permissions, magic-link sessions, and audit logs
- **Domain Management** — Automatic SSL/TLS via Let's Encrypt (DNS-01 or HTTP-01 challenge)
- **Monitoring & Logs** — Prometheus + Grafana + Loki for metrics, labels, and tail-able streams
- **MCP Integration** — AI-native platform management via Model Context Protocol
- **Skills Marketplace** — Reusable business modules (CRM, ERP, LMS, etc.)
- **Template Platform** — One-click project generation
- **WhatsApp Business API** — Multi-instance WhatsApp messaging with anti-ban protection
  - Baileys (WhatsApp Web) and WhatsApp Business API support
  - Built-in rate limiting and quality monitoring
  - Campaign management with bulk messaging
  - Real-time webhook integration
  - Chatwoot inbox integration

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                       CLIENT LAYER                          │
│  Dashboard (Next.js) │ CLI │ SDK │ MCP │ AI Agents         │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      CONTROL PLANE                          │
│  Traefik (TLS / Let's Encrypt / ACME)                       │
│  App:<domain>       → Dashboard                             │
│  api:<domain>/api   → NestJS API                            │
│  storage:<domain>   → MinIO Console                         │
│  jmap:<domain>      → Stalwart JMAP                         │
│  *.<project>.domain  → Per-project deployments              │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                     RUNTIME PLANE                           │
│  Postgres │ pgbouncer │ Redis │ NATS │ MinIO │ Stalwart    │
│  API │ Dashboard │ Prometheus │ Grafana │ cAdvisor          │
└─────────────────────────────────────────────────────────────┘
```

| Rule | Description |
|------|-------------|
| **Everything API-first** | If functionality cannot be accessed via API, it is incomplete |
| **Dashboard = API = SDK = MCP** | All interfaces consume the same backend |
| **All actions generate events** | `project.created`, `deployment.started`, `email.sent`, etc. |
| **Provider abstraction** | Storage, email, and git providers are adapter-based |
| **Shared infrastructure** | Platform services are shared across all projects |

---

## 📦 Technology Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | Next.js 15 (App Router) |
| **Backend** | NestJS 10 |
| **Database** | PostgreSQL 16 (with pgbouncer connection pool) |
| **Cache/Sessions** | Redis 7 |
| **Queue/Events/Realtime** | NATS 2.10 (Core + JetStream) |
| **Object Storage** | MinIO (S3-compatible) |
| **Reverse Proxy / TLS** | Traefik 3.3 + Let's Encrypt |
| **Mail Server** | Stalwart 0.16.x (SMTP + JMAP) |
| **Container Runtime** | Docker 25 + Compose v2 |
| **Monitoring** | Prometheus + Grafana + cAdvisor |
| **CLI** | Commander.js |
| **SDK** | TypeScript 5.x |
| **Package Manager** | pnpm |

---

## 🚀 Quick Start

### Option A — One-Command VPS Install (recommended for production)

For a fresh Ubuntu 22.04+ or Debian 12+ VPS with **root SSH access** and a domain whose DNS you control:

```bash
curl -sSL https://fidscript.dev/install.sh | sudo bash
```

The dumb bootstrap installer (`installer/scripts/install.sh`):
1. Installs Docker + Compose if missing.
2. Clones the repo to `/opt/fidscript-deploy`.
3. Copies the install tree to `/opt/fidscript`.
4. Generates all secrets (chmod 600) under `/opt/fidscript/docker/secrets/`.
5. Writes a minimal IP-fallback Traefik config (no domain routing yet).
6. Brings the stack up (`docker compose up -d --build`).
7. Runs `prisma migrate deploy`.
8. Prints the IP-fallback access URL.

You then open that URL → the in-browser **/setup wizard** collects your real domain, Cloudflare token (optional), and admin credentials, then renders Traefik dynamic config and DNS records.

### Option B — Manual Install (for review / dev on this machine)

```bash
# 1. Clone the repo
git clone https://github.com/kennedymwangi/fidscript-deploy.git
cd fidscript-deploy

# 2. Generate secrets and write .env files
sudo bash installer/scripts/setup-wizard.sh
#    → interactive: domain, admin email, admin password, optional Cloudflare token
#    → writes /opt/fidscript/docker/.env  (per-host) and  secrets/api.env

# 3. Build and start
cd /opt/fidscript/docker
sudo docker compose up -d --build

# 4. Verify (waits up to 5 min)
docker compose ps                          # all services healthy
curl -fsS https://<your-domain>/api/v1/health
```

After the API is healthy, the dashboard accepts logins at `https://app.<your-domain>`.

### Option C — Local Development (no VPS, no domain)

For working on the dashboard or API from a laptop:

```bash
git clone https://github.com/kennedymwangi/fidscript-deploy.git
cd fidscript-deploy
pnpm install
cp .env.example .env.local              # local dev defaults
pnpm dev                                # starts API on :3001 and dashboard on :3001
```

See **[Local Development Guide](docs/INSTALL_LOCAL.md)** for full local-mode instructions (Docker Compose dev stack, when to use `db push` vs `migrate deploy`, port forwarding, etc.).

---

## ✅ Prerequisites

| What | Minimum | Notes |
|------|---------|-------|
| **OS (VPS)** | Ubuntu 22.04 / Debian 12 | The bootstrap installer only auto-installs on these |
| **CPU** | 2 vCPU | 4+ recommended for production |
| **RAM** | 4 GB | 8 GB+ recommended; dashboard+API alone need ~1.5 GB |
| **Disk** | 40 GB | 100 GB+ SSD recommended |
| **Ports open** | 22, 80, 443 | Also 25/465/993 for mail, 9000-9001 for MinIO if external |
| **Domain** | a domain you control | Required for HTTPS. Free Let's Encrypt cert issued at install |
| **DNS provider** | Cloudflare (optional but recommended) | DNS-01 challenge works without port 80; HTTP-01 needs port 80 reachable |
| **Node.js (local dev)** | 20 LTS | Required for `pnpm dev` only — not for the VPS install |
| **pnpm** | 9+ | For monorepo workspaces |
| **Docker** | 24+ | Auto-installed by the bootstrap |
| **Docker Compose** | v2.20+ | Auto-installed by the bootstrap |

The full bootstrap installer handles Docker, Compose, secrets, and migrations for you — you don't need to install anything except `curl` and `sudo`.

---

## ⚙️ Environment Variables

The platform reads its config from **three places** in production:

| File | Purpose | Generated by |
|------|---------|--------------|
| `/opt/fidscript/docker/.env` | Compose-time vars (domain, IPs, passwords, TLS mode) | `installer/scripts/setup-wizard.sh` |
| `/opt/fidscript/docker/secrets/api.env` | API + pgbouncer env (DB/Redis creds, OAuth, SMTP) | `installer/scripts/setup-wizard.sh` |
| `/opt/fidscript/docker/secrets/*.txt` | Long random secrets (postgres_password, jwt_secret, cf_api_token, …) | `installer/scripts/setup-wizard.sh` (or `install.sh`) |

For local development, copy `.env.example` to `.env.local` — see that file for the full annotated list. Every var has a comment explaining what it does, the default, and whether it's required for dev vs production.

### Key vars at a glance

```env
# ── Domain (REQUIRED) ────────────────────────────────────────────
DOMAIN=deploy.fidscript.com             # The base domain Traefik routes
PLATFORM_DOMAIN=deploy.fidscript.com    # Same value — alias used by API
PLATFORM_MAIL_HOST=mail.deploy.fidscript.com
SERVER_IP=72.61.89.110                  # Auto-detected at install

# ── Admin (REQUIRED) ─────────────────────────────────────────────
ADMIN_EMAIL=you@example.com             # Used for Let's Encrypt + first login
ADMIN_PASSWORD=change-me-12chars-min    # Force-change on first login

# ── TLS / SSL ────────────────────────────────────────────────────
AUTO_SSL=true                           # Let's Encrypt via Traefik ACME

# ── Cloudflare (OPTIONAL — enables DNS-01 challenge) ─────────────
# Create a token at https://dash.cloudflare.com/profile/api-tokens
# Permissions: Zone:DNS:Edit on your zone
# Get Zone ID from the API: GET /zones?name=<domain>
# Token is read from secrets/cf_api_token.txt (chmod 600)

# ── Storage path on host ─────────────────────────────────────────
STORAGE_PATH=/data/fidscript            # Named volumes back this on Linux

# ── Signup protection (optional) ─────────────────────────────────
# Set SIGNUP_INVITE_KEYWORD on the API and (SHA-256) NEXT_PUBLIC_INVITE_HASH on
# the dashboard to require a keyword at /register. Empty = open registration.
# Generate: printf '%s' "<keyword>" | sha256sum
SIGNUP_INVITE_KEYWORD=
NEXT_PUBLIC_INVITE_HASH=
```

See **[`.env.example`](.env.example)** for the full annotated list and **[`docs/requirements.md`](docs/requirements.md)** for hardware specs.

---

## 🔌 Service URLs After Install

| URL | Purpose |
|-----|---------|
| `https://app.<domain>` | **Dashboard** (login + everything) |
| `https://<domain>` | Landing / marketing site |
| `https://api.<domain>/api/v1/health` | API health check |
| `https://storage.<domain>` | MinIO console (admin) |
| `https://jmap.<domain>` | Stalwart JMAP (mail clients) |
| `https://<project>.<domain>` | Per-project deployment |

For the in-browser onboarding wizard: `https://<domain>/setup`.

---

## 🗄️ Database Migrations

Migrations are managed by **Prisma** (`apps/api/prisma/`).

```bash
# Apply pending migrations (production — safe, idempotent)
docker compose -f /opt/fidscript/docker/docker-compose.yml \
  exec api npx prisma migrate deploy

# Create a new migration after schema changes (development)
docker compose -f /opt/fidscript/docker/docker-compose.yml \
  exec api npx prisma migrate dev --name your_change

# Seed admin user (idempotent — skipped if admin already exists)
docker compose -f /opt/fidscript/docker/docker-compose.yml \
  exec api npx prisma db seed
```

The API's entrypoint runs `prisma migrate deploy` + `prisma db seed` automatically on every container start (set `SKIP_SEED=1` to skip). Migrations live in `apps/api/prisma/migrations/`.

---

## 🌐 Cloudflare Setup (optional but recommended)

1. Add your domain to Cloudflare (free tier is fine).
2. Create an API token at <https://dash.cloudflare.com/profile/api-tokens> with **Zone / DNS / Edit** permission on your zone.
3. Find the **Zone ID** on the zone overview page.
4. Provide the token when prompted by `setup-wizard.sh` — the wizard will:
   - Create `app`, `jmap`, `storage`, `mail` A records → your server IP.
   - Create a wildcard `*.<domain>` A record.
   - Create the MX record pointing to `mail.<domain>`.

If you skip Cloudflare, the installer falls back to **HTTP-01** ACME challenges (you must create the A records manually and have port 80 reachable).

---

## ✉️ Stalwart Email Setup

Stalwart comes pre-configured for TLS, SMTP submission (587/465), IMAP (993), and JMAP. After install:

1. Visit `https://<domain>/platform/email/settings` (admin only).
2. Use **Magic Code** or **Password** login to authenticate.
3. Create mailboxes under your domain (`postmaster@<domain>` is seeded).
4. Configure outbound DKIM/SPF/DMARC records (see `docs/EMAIL_DELIVERABILITY.md`).

The admin token is at `/opt/fidscript/docker/secrets/stalwart_admin_token.txt`. The Stalwart admin UI is local-only (port 8090 → 8080 on `127.0.0.1`); expose it via SSH tunnel for browser access.

---

## 🔄 After Startup — What You'll See

1. **First visit to `https://<domain>`** → IP-fallback dashboard or marketing landing.
2. **`/setup`** (only shown before first admin exists) → 4-step wizard:
   - Pick **Magic Code** or **Password** login.
   - Enter platform domain, Cloudflare token (optional), admin email.
   - Real-time SSE progress (DNS records, TLS cert, secret generation).
   - Done → redirect to `/login`.
3. **`/login`** → enter admin email + password (or request magic code).
4. **`/projects`** → empty state ("Create your first project"). Each project provisions its own DB namespace, storage bucket, and realtime channels.

The admin user is created on first migration + seed from `ADMIN_EMAIL`/`ADMIN_PASSWORD`. **The first user is forced to change the password on first login.**

---

## 📁 Project Structure

```
fidscript-deploy/
├── apps/
│   ├── dashboard/           # Next.js 15 (App Router)
│   │   ├── src/app/(auth)/  # Login, register, setup, onboarding
│   │   ├── src/app/(app)/   # Authenticated dashboard (projects, settings, …)
│   │   └── …
│   │
│   ├── api/                 # NestJS backend (23 modules)
│   │   ├── src/modules/     # auth, projects, deployments, storage, …
│   │   ├── prisma/          # schema.prisma, migrations/, seed.ts
│   │   └── …
│   │
│   ├── whatsapp-api/        # WhatsApp Business API (Baileys + Anti-Ban)
│   ├── cli/                 # FIDScript CLI
│   └── mcp-server/          # MCP server for AI agents (Phase 17)
│
├── packages/                # shared workspace packages
│   ├── sdk/                 # JavaScript/TypeScript SDK
│   ├── shared/ types/ events/ config/ ui/ eslint-config/
│
├── installer/               # VPS install scripts (this README's home)
│   ├── scripts/             # install.sh, setup-wizard.sh, health-check.sh
│   ├── docker/              # docker-compose.yml + secrets/ + traefik/
│   └── traefik/             # Static config (rendered by setup-wizard.sh)
│
├── docs/                    # Documentation (see docs/START_HERE.md)
│   ├── phases/              # Backend phases 00–23 (all verified)
│   ├── phases/frontend/     # Dashboard phases F00–F11 (F02 next)
│   ├── product/             # Frontend blueprint (philosophy, journeys, services, screens, components)
│   ├── install.md           # Full installation guide
│   └── requirements.md      # Hardware / software matrix
│
├── .env.example             # Annotated local-dev env (mirrors installer/docker/.env)
├── CLAUDE.md                # AI development constitution (read this if you're an agent)
└── package.json             # pnpm workspace
```

---

## 🩺 Health Check & Operations

```bash
# All services (status, health, log tail)
docker compose -f /opt/fidscript/docker/docker-compose.yml ps

# Health verification (waits, retries, exits non-zero on red)
sudo /opt/fidscript/scripts/health-check.sh

# Tail logs of one service
docker compose -f /opt/fidscript/docker/docker-compose.yml logs -f api

# Validate full stack against expected services
sudo /opt/fidscript/scripts/validate-stack.sh
```

Update to the latest version:

```bash
cd /opt/fidscript-deploy
git pull origin main
cd /opt/fidscript/docker
sudo docker compose pull
sudo docker compose up -d --build
```

---

## 🛡️ Security

- All passwords hashed with bcrypt (cost 12).
- Database credentials encrypted with AES-256-GCM at rest (`encryption_key`).
- API keys hashed with Argon2.
- TLS 1.3 for all in-transit communication (Traefik + Let's Encrypt).
- HttpOnly + Secure cookies for sessions.
- Full audit logging of sensitive operations.
- Per-project tenant isolation enforced at the API layer.
- All secrets mounted as `chmod 600` files; `_FILE` env convention lets the API read them without exposing them in `docker inspect`.

---

## 📚 Documentation

- **[`docs/START_HERE.md`](docs/START_HERE.md)** — orient any agent or contributor
- **[`docs/install.md`](docs/install.md)** — full installation guide with troubleshooting
- **[`docs/requirements.md`](docs/requirements.md)** — hardware / software matrix
- **[`docs/INSTALL_LOCAL.md`](docs/INSTALL_LOCAL.md)** — local development without a VPS
- **[`docs/phases/README.md`](docs/phases/README.md)** — backend phases 00–23
- **[`docs/phases/frontend/README.md`](docs/phases/frontend/README.md)** — frontend phases F00–F11
- **[`CLAUDE.md`](CLAUDE.md)** — AI agent development constitution
- **[`AGENT_STATUS.md`](AGENT_STATUS.md)** — current build state
- **[`CHANGELOG.md`](CHANGELOG.md)** — every change ever shipped

---

## 🤝 Contributing

This project is in early production. Follow [`CLAUDE.md`](CLAUDE.md) for coding standards and rules. PRs that don't update the changelog or whose implementation drifts from the phase docs will be rejected.

---

## 📄 License

MIT License — see [LICENSE](LICENSE) for details.

---

<p align="center">
  <strong>FIDScript Deploy</strong> — Self-Hosted Developer Operating System<br>
  <sub>Built by Next Mavens</sub>
</p>