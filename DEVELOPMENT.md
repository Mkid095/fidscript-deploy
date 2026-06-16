# Development Guide

This guide will help you set up the FIDScript Deploy development environment.

---

## Prerequisites

- Node.js 20+
- pnpm 9+
- Docker & Docker Compose

---

## Initial Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-org/fidscript-deploy.git
   cd fidscript-deploy
   ```

2. **Install dependencies**
   ```bash
   pnpm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Start infrastructure services**
   ```bash
   docker compose up -d
   ```

---

## Running the Development Servers

### All services (dashboard + api)
```bash
pnpm dev
```

### Individual services
```bash
# Dashboard only (port 3001)
pnpm --filter @fidscript/dashboard dev

# API only (port 3000)
pnpm --filter @fidscript/api dev
```

---

## Available Commands

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start all development servers |
| `pnpm build` | Build all packages and apps |
| `pnpm lint` | Run ESLint |
| `pnpm test` | Run tests |
| `pnpm typecheck` | Run TypeScript type checking |
| `pnpm format` | Format code with Prettier |
| `pnpm clean` | Clean build artifacts |

---

## Project Structure

```
fidscript-deploy/
├── apps/
│   ├── dashboard/    # Next.js frontend
│   └── api/          # NestJS backend
├── packages/
│   ├── sdk/          # TypeScript SDK
│   ├── types/        # Shared TypeScript types
│   ├── events/       # Event definitions
│   ├── shared/       # Shared utilities
│   ├── config/       # Configuration
│   └── ui/           # Shared UI components
├── docs/             # Service specifications
└── scripts/          # Build/utility scripts
```

---

## Adding a New Service

1. Read `docs/services/[service].md` for the service specification
2. Create the API module in `apps/api/src/modules/[service]/`
3. Add SDK methods in `packages/sdk/src/client.ts`
4. Add UI components in `packages/ui/src/components/`
5. Update `AGENT_STATUS.md`

---

## Troubleshooting

### pnpm install fails
```bash
pnpm store prune
rm -rf node_modules
pnpm install
```

### Type errors
```bash
pnpm typecheck
```

### Port already in use
Check `.env` for port configuration or stop other services.
