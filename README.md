<div align="center">
<img width="1200" height="475" alt="FIDScript Deploy" src="https://fidscript.dev/banner.png" />
</div>

# FIDScript Deploy

**A self-hosted Developer Operating System**

FIDScript Deploy transforms any VPS into a complete, private application cloud with hosting, authentication, storage, databases, queues, cron jobs, email, realtime infrastructure, AI integration, and MCP-native platform management.

[![Version](https://img.shields.io/badge/version-1.0.0--alpha-red?style=for-the-badge)](https://fidscript.dev)
[![Status](https://img.shields.io/badge/status-Phase%200%20(Architecture)-orange?style=for-the-badge)](./ARCHITECTURE.md)
[![License](https://img.shields.io/badge/license-MIT-blue?style=for-the-badge)](LICENSE)

---

## ✨ Features

- **Application Hosting** — Deploy frontend, backend, worker, and static apps with Docker + Traefik
- **Managed Databases** — PostgreSQL with automated backups and connection pooling
- **Realtime Infrastructure** — NATS-powered event bus, pub/sub, and websocket channels
- **Email Platform** — Stalwart SMTP server with transactional email support
- **Storage** — S3-compatible object storage (MinIO) with multi-cloud adapters
- **Serverless Functions** — Deploy and invoke functions with isolated execution
- **Queue System** — NATS JetStream for background job processing
- **Cron Scheduler** — Managed cron jobs with execution history
- **Authentication** — User management, roles, permissions, sessions, and audit logs
- **Domain Management** — Automatic SSL/TLS via Let's Encrypt
- **AI Copilot** — Gemini-powered assistant for platform management
- **MCP Integration** — AI-native platform management via Model Context Protocol
- **Skills Marketplace** — Reusable business modules (CRM, ERP, LMS, etc.)
- **Template Platform** — One-click project generation

## 🏗️ Architecture

FIDScript follows a strict **architecture-first** development approach. Before any code is written, all contracts (schemas, APIs, events, SDK methods) are defined in [ARCHITECTURE.md](./ARCHITECTURE.md).

### Core Design Principles

| Rule | Description |
|------|-------------|
| **Everything API-first** | If functionality cannot be accessed via API, it is incomplete |
| **Dashboard = API = SDK = MCP** | All interfaces consume the same backend |
| **All actions generate events** | `project.created`, `deployment.started`, `email.sent`, etc. |
| **Provider abstraction** | Storage, email, and git providers are adapter-based |
| **Shared infrastructure** | Platform services are shared across all projects |

### System Layers

```
┌────────────────────────────────────────────────────┐
│                    CLIENT LAYER                     │
│  Dashboard (Next.js) │ CLI │ SDK │ MCP │ AI Agents │
└────────────────────────────────────────────────────┘
                         │
                         ▼
┌────────────────────────────────────────────────────┐
│                   CONTROL PLANE                     │
│  Auth │ Projects │ Deployment │ Domain │ Storage   │
│  Functions │ Queues │ Cron │ Email │ Realtime      │
│  Monitoring │ Logging │ Skills │ Templates │ AI     │
└────────────────────────────────────────────────────┘
                         │
                         ▼
┌────────────────────────────────────────────────────┐
│                   RUNTIME PLANE                    │
│  PostgreSQL │ Redis │ NATS │ MinIO │ Traefik      │
│  Docker │ Stalwart │ Prometheus │ Loki │ Vector    │
└────────────────────────────────────────────────────┘
```

---

## 📦 Technology Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | Next.js 15 (App Router) |
| **Backend** | NestJS 10 |
| **Database** | PostgreSQL 16 |
| **Cache/Sessions** | Redis 7 |
| **Queue/Events/Realtime** | NATS 2.10 |
| **Object Storage** | MinIO 2024 |
| **Reverse Proxy** | Traefik 3.0 |
| **Container Runtime** | Docker 25 |
| **Mail Server** | Stalwart 3.0 |
| **CLI** | Commander.js |
| **SDK** | TypeScript 5.x |
| **Package Manager** | pnpm |

---

## 🚀 Quick Start

### Installation (One-Command VPS Setup)

```bash
curl -sSL https://fidscript.dev/install.sh | bash
```

This installs Docker, Docker Compose, Traefik, and all required infrastructure on a fresh VPS.

### Development Setup

```bash
# Clone the repository
git clone https://github.com/fidscript/deploy.git
cd deploy

# Install dependencies
pnpm install

# Copy environment variables
cp .env.example .env.local

# Start development servers
pnpm dev
```

### Environment Variables

```env
# Platform
PLATFORM_URL=http://localhost:3000
API_URL=http://localhost:3001

# Database
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/fidscript

# Redis
REDIS_URL=redis://localhost:6379

# NATS
NATS_URL=nats://localhost:4222

# MinIO
MINIO_ENDPOINT=localhost:9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin

# AI (Gemini)
GEMINI_API_KEY=your_gemini_api_key
```

---

## 📁 Project Structure

```
fidscript-deploy/
├── apps/
│   ├── dashboard/           # Next.js frontend
│   │   ├── app/
│   │   │   ├── (auth)/     # Login, register
│   │   │   ├── (dashboard)/# Main dashboard
│   │   │   └── installer/  # VPS setup wizard
│   │   ├── components/
│   │   └── package.json
│   │
│   └── api/                # NestJS backend
│       ├── src/
│       │   ├── modules/    # Auth, Projects, Deployments, etc.
│       │   ├── services/
│       │   └── dto/
│       └── package.json
│
├── packages/
│   ├── sdk/                 # JavaScript/TypeScript SDK
│   ├── shared/             # Shared utilities
│   ├── types/              # TypeScript types
│   └── events/             # Event definitions
│
├── installer/               # VPS installer scripts
├── docs/                   # Documentation
│   ├── api/
│   ├── sdk/
│   └── mcp/
│
├── ARCHITECTURE.md          # Full architecture specification
├── MASTER_DEVELOPMENT_GUIDE.md
└── package.json
```

---

## 🔄 Development Phases

FIDScript Deploy is built in 23 sequential phases. No phase is skipped.

| Phase | Name | Status |
|-------|------|--------|
| 0 | Architecture First | ✅ Complete |
| 1 | Repository Architecture | ✅ Complete |
| 2 | Installer System | 🔄 In Progress |
| 3 | Identity & Access | ⏳ Pending |
| 4 | Projects Engine | ⏳ Pending |
| 5 | Infrastructure Foundation | ⏳ Pending |
| 6 | Deployment Engine | ⏳ Pending |
| 7 | Domain Management | ⏳ Pending |
| 8 | Storage Platform | ⏳ Pending |
| 9 | Authentication Platform | ⏳ Pending |
| 10 | Email Platform | ⏳ Pending |
| 11 | Realtime Platform | ⏳ Pending |
| 12 | Database Platform | ⏳ Pending |
| 13 | Functions Platform | ⏳ Pending |
| 14 | Queues Platform | ⏳ Pending |
| 15 | Scheduler Platform | ⏳ Pending |
| 16 | Monitoring Platform | ⏳ Pending |
| 17 | Logging Platform | ⏳ Pending |
| 18 | SDK Platform | ⏳ Pending |
| 19 | MCP Platform | ⏳ Pending |
| 20 | Skills Platform | ⏳ Pending |
| 21 | Template Platform | ⏳ Pending |
| 22 | AI Layer | ⏳ Pending |
| 23 | Marketplace | ⏳ Pending |

See [ARCHITECTURE.md](./ARCHITECTURE.md) for complete phase dependencies and specifications.

---

## 🎯 Success Criteria

A user should be able to:

1. Install FIDScript Deploy on any VPS with one command
2. Create a project and connect a GitHub repository
3. Deploy frontend and backend applications
4. Connect custom domains with automatic SSL
5. Create mailboxes and send transactional emails
6. Enable user authentication for applications
7. Upload and manage files in object storage
8. Use realtime subscriptions and event streams
9. Deploy and invoke serverless functions
10. Publish and consume queue messages
11. Schedule and manage cron jobs
12. Monitor application metrics and logs

All of the above should be manageable via:
- **Dashboard** (web interface)
- **API** (REST endpoints)
- **SDK** (TypeScript/JavaScript)
- **CLI** (terminal commands)
- **MCP** (AI agent tools)
- **AI Agents** (intelligent assistance)

---

## 📚 Documentation

- [Architecture Specification](./ARCHITECTURE.md) — Complete system design
- [Master Development Guide](./MASTER_DEVELOPMENT_GUIDE.md) — Development methodology
- [API Documentation](./docs/api/) — REST API reference
- [SDK Documentation](./docs/sdk/) — Client SDK usage
- [MCP Documentation](./docs/mcp/) — AI agent tool reference

---

## 🛡️ Security

- All passwords hashed with bcrypt (cost 12)
- Database credentials encrypted with AES-256-GCM
- API keys hashed with Argon2
- TLS 1.3 for all in-transit communication
- HttpOnly + Secure cookies for sessions
- Full audit logging of sensitive operations

---

## 📄 License

MIT License — see [LICENSE](LICENSE) for details.

---

## 🤝 Contributing

This project is in early development. Follow the [Master Development Guide](./MASTER_DEVELOPMENT_GUIDE.md) for contribution guidelines and code standards.

---

<p align="center">
  <strong>FIDScript Deploy</strong> — Self-Hosted Developer Operating System<br>
  <sub>Built with ❤️ by Next Mavens</sub>
</p>
