# CLAUDE.md

This file provides comprehensive guidance to Claude AI when working with the Next Mavens Fidscript WhatsApp API codebase.

## Project Identity

- **Product Name**: Next Mavens Fidscript WhatsApp API
- **Package Name**: nextmavens-fidscript-whatsapp-api
- **Based On**: Evolution API
- **Organization**: Next Mavens
- **Website**: https://nextmavens.com
- **Support**: info@nextmavens.com

## Project Overview

**Next Mavens Fidscript WhatsApp API** is an enterprise-grade WhatsApp API platform built on Evolution API with advanced features:

### Key Features
- **Anti-Ban System**: Rate limiting, quality monitoring, block tracking
- **Latest Message Types**: Interactive buttons, lists, catalogs, carousels, flows
- **Multi-Provider Support**: Baileys, Meta Business API, Evolution Channel

### Tech Stack
- **Runtime**: Node.js 20+
- **Language**: TypeScript 5+
- **Framework**: Express.js
- **Database**: PostgreSQL/MySQL via Prisma ORM
- **Cache**: Redis + Node-cache
- **WhatsApp**: Baileys (Web) + Meta Business API

## Common Development Commands

### Build and Run
```bash
# Development
npm run dev:server    # Run in development with hot reload (tsx watch)

# Production
npm run build        # TypeScript check + tsup build
npm run start:prod   # Run production build

# Direct execution
npm start           # Run with tsx
```

### Code Quality
```bash
npm run lint        # ESLint with auto-fix
npm run lint:check  # ESLint check only
npm run commit      # Interactive commit with commitizen
```

### Database Management (PostgreSQL - Docker)
```bash
# Set database provider first
export DATABASE_PROVIDER=postgresql

# Generate Prisma client (automatically uses DATABASE_PROVIDER env)
npm run db:generate

# Deploy migrations (production)
npm run db:deploy      # Unix/Mac
npm run db:deploy:win  # Windows

# Development migrations (with sync to provider folder)
npm run db:migrate:dev      # Unix/Mac
npm run db:migrate:dev:win  # Windows

# Open Prisma Studio
npm run db:studio
```

### Testing
```bash
npm test    # Run tests with watch mode
```

## Architecture Overview

### Core Structure
- **Multi-tenant SaaS**: Complete instance isolation with per-tenant authentication
- **Multi-provider database**: PostgreSQL and MySQL via Prisma ORM with provider-specific schemas and migrations
- **WhatsApp integrations**: Baileys, Meta Business API, and Evolution API with unified interface
- **Event-driven architecture**: EventEmitter2 for internal events + WebSocket, RabbitMQ, SQS, NATS, Pusher for external events
- **Microservices pattern**: Modular integrations for chatbots, storage, and external services
- **Anti-Ban System**: Built-in rate limiting, quality monitoring, and block tracking

### Directory Layout
```
src/
├── api/
│   ├── controllers/     # HTTP route handlers (thin layer)
│   ├── services/        # Business logic (core functionality)
│   │   ├── rate-limiter.service.ts      # Anti-ban rate limiting
│   │   ├── quality-monitor.service.ts    # Template quality tracking
│   │   ├── block-tracker.service.ts     # Block detection
│   │   ├── anti-ban.service.ts          # Anti-ban orchestrator
│   │   ├── analytics.service.ts         # Analytics endpoints
│   │   └── campaign.service.ts          # Campaign management
│   ├── repository/      # Data access layer (Prisma)
│   ├── dto/            # Data Transfer Objects (simple classes)
│   ├── guards/         # Authentication/authorization middleware
│   ├── middleware/     # Custom middleware (rate limiting, quality checks)
│   ├── integrations/   # External service integrations
│   │   ├── channel/    # WhatsApp providers (Baileys, Business API, Evolution)
│   │   ├── chatbot/    # AI/Bot integrations (OpenAI, Dify, Typebot, Chatwoot)
│   │   ├── event/      # Event systems (WebSocket, RabbitMQ, SQS, NATS, Pusher)
│   │   └── storage/    # File storage (S3, MinIO)
│   ├── routes/         # Express route definitions (RouterBroker pattern)
│   └── types/          # TypeScript type definitions
├── config/             # Environment and app configuration
├── cache/             # Redis and local cache implementations
├── exceptions/        # Custom HTTP exception classes
├── utils/            # Shared utilities and helpers
└── validate/         # JSONSchema7 validation schemas
```

### Anti-Ban System Components

**Rate Limiter Service** (`src/api/services/rate-limiter.service.ts`):
- Per-contact rate limiting (1 message per 6 seconds)
- Per-instance throughput limits
- Burst control (45 messages per 6 seconds)
- Hourly tracking (600 messages per contact)

**Quality Monitor Service** (`src/api/services/quality-monitor.service.ts`):
- Template quality score tracking (GREEN/YELLOW/RED)
- Webhook handling for `message_template_quality_update`
- Auto-pause templates with RED quality
- Admin alerts on quality drops

**Block Tracker Service** (`src/api/services/block-tracker.service.ts`):
- Block detection from failed messages
- Auto-suppression after 3+ blocks
- Block rate analytics

**Anti-Ban Orchestrator** (`src/api/services/anti-ban.service.ts`):
- Unified interface for all anti-ban components
- Automatic throttling on warnings
- Account health monitoring

### Key Integration Points

**Channel Integrations** (`src/api/integrations/channel/`):
- **Baileys**: WhatsApp Web client with QR code authentication
- **Business API**: Official Meta WhatsApp Business API
- **Evolution API**: Custom WhatsApp integration
- Connection lifecycle management per instance with automatic reconnection

**Chatbot Integrations** (`src/api/integrations/chatbot/`):
- **EvolutionBot**: Native chatbot with trigger system
- **Chatwoot**: Customer service platform integration
- **Typebot**: Visual chatbot flow builder
- **OpenAI**: AI capabilities including GPT and Whisper (audio transcription)
- **Dify**: AI agent workflow platform
- **Flowise**: LangChain visual builder
- **N8N**: Workflow automation platform
- **EvoAI**: Custom AI integration

**Event Integrations** (`src/api/integrations/event/`):
- **WebSocket**: Real-time Socket.io connections
- **RabbitMQ**: Message queue for async processing
- **Amazon SQS**: Cloud-based message queuing
- **NATS**: High-performance messaging system
- **Pusher**: Real-time push notifications

**Storage Integrations** (`src/api/integrations/storage/`):
- **AWS S3**: Cloud object storage
- **MinIO**: Self-hosted S3-compatible storage
- Media file management and URL generation

### Latest Message Types

| Message Type | Endpoint | Description |
|-------------|----------|-------------|
| Interactive Buttons | `POST /message/sendButtons/:name` | Up to 3 reply buttons |
| List Messages | `POST /message/sendList/:name` | Modal list with sections |
| Product Catalog | `POST /message/sendCatalog/:name` | Single product from catalog |
| Product Carousel | `POST /message/sendCarousel/:name` | Horizontal product cards |
| Flows | `POST /message/sendFlow/:name` | Interactive multi-screen forms |
| Polls | `POST /message/sendPoll/:name` | Voting/polling messages |
| Message Editing | `PATCH /message/edit/:id` | Edit sent messages |
| Disappearing Messages | `POST /chat/disappear/:name` | Set disappearing mode |

### Database Schema Management
- Separate schema files: `postgresql-schema.prisma` and `mysql-schema.prisma`
- Environment variable `DATABASE_PROVIDER` determines active database
- Migration folders are provider-specific and auto-selected during deployment
- New anti-ban models: `RateLimitState`, `TemplateQuality`, `BlockEvent`, `SuppressedContact`

### Authentication & Security
- **API key-based authentication** via `apikey` header (global or per-instance)
- **Instance-specific tokens** for WhatsApp connection authentication
- **Guards system** for route protection and authorization
- **Input validation** using JSONSchema7 with RouterBroker `dataValidate`
- **Built-in rate limiting** via Anti-Ban System
- **Webhook signature validation** for external integrations

## Important Implementation Details

### WhatsApp Instance Management
- Each WhatsApp connection is an "instance" with unique name
- Instance data stored in database with connection state
- Session persistence in database or file system (configurable)
- Automatic reconnection handling with exponential backoff

### Message Queue Architecture
- Supports RabbitMQ, Amazon SQS, and WebSocket for events
- Event types: message.received, message.sent, connection.update, etc.
- Configurable per instance which events to send

### Media Handling
- Local storage or S3/Minio for media files
- Automatic media download from WhatsApp
- Media URL generation for external access
- Support for audio transcription via OpenAI

### Multi-tenancy Support
- Instance isolation at database level
- Separate webhook configurations per instance
- Independent integration settings per instance

## Environment Configuration

Key environment variables are defined in `.env.example`. The system uses a strongly-typed configuration system via `src/config/env.config.ts`.

Critical configurations:
- `DATABASE_PROVIDER`: postgresql (recommended) or mysql
- `DATABASE_URL`: PostgreSQL connection string (for Docker self-hosted)
- `AUTHENTICATION_API_KEY`: Global API authentication
- `REDIS_ENABLED`: Enable Redis cache (recommended for production)
- `REDIS_URL`: Redis connection string
- `RABBITMQ_ENABLED`/`SQS_ENABLED`: Message queue options

## Development Guidelines

### Core Principles
- **Always respond in English** for user communication
- **Follow established architecture patterns** (Service Layer, RouterBroker, etc.)
- **Robust error handling** with retry logic and graceful degradation
- **Multi-database compatibility** (PostgreSQL and MySQL)
- **Security-first approach** with built-in anti-ban system
- **Performance optimizations** with Redis caching and connection pooling

### Code Standards
- **TypeScript strict mode** with full type coverage
- **JSONSchema7** for input validation (not class-validator)
- **Conventional Commits** enforced by commitlint
- **ESLint + Prettier** for code formatting
- **Service Object pattern** for business logic
- **RouterBroker pattern** for route handling with `dataValidate`

### Architecture Patterns
- **Multi-tenant isolation** at database and instance level
- **Event-driven communication** with EventEmitter2
- **Microservices integration** pattern for external services
- **Connection pooling** and lifecycle management
- **Caching strategy** with Redis primary and Node-cache fallback
- **Anti-ban system** for WhatsApp account protection

### Testing Approach

Currently, the project has minimal formal testing infrastructure:
- **Manual testing** is the primary approach
- **Integration testing** in development environment
- **No unit test suite** currently implemented
- Test files can be placed in `test/` directory as `*.test.ts`
- Run `npm test` for watch mode development testing

### Recommended Testing Strategy
- Focus on **critical business logic** in services
- **Mock external dependencies** (WhatsApp APIs, databases)
- **Integration tests** for API endpoints
- **Manual testing** for WhatsApp connection flows

## Deployment Considerations

- Docker support with `Dockerfile` and `docker-compose.yaml`
- PostgreSQL and Redis recommended for production (Docker self-hosted)
- Graceful shutdown handling for connections
- Health check endpoints for monitoring
- Sentry integration for error tracking
- Telemetry for usage analytics (non-sensitive data only)
