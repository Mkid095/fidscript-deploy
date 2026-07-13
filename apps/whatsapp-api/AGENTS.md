# Next Mavens Fidscript WhatsApp API - AI Agent Guidelines

This document provides comprehensive guidelines for AI agents (Claude, GPT, Cursor, etc.) working with the Next Mavens Fidscript WhatsApp API codebase.

## Project Overview

**Next Mavens Fidscript WhatsApp API** is an enterprise-grade, production-ready WhatsApp API platform built on Evolution API with advanced features including:
- Anti-ban protection system (rate limiting, quality monitoring, block tracking)
- Latest WhatsApp message types (interactive buttons, lists, catalogs, carousels, flows)
- Multi-provider support (Baileys, Meta Business API)
- Built with Node.js, TypeScript, and Express.js

## Project Identity

- **Product Name**: Next Mavens Fidscript WhatsApp API
- **Package Name**: nextmavens-fidscript-whatsapp-api
- **Based On**: Evolution API
- **Organization**: Next Mavens
- **Website**: https://nextmavens.com
- **Support**: info@nextmavens.com

## Project Structure & Module Organization

### Core Directories
- **`src/`** – TypeScript source code with modular architecture
  - `api/controllers/` – HTTP route handlers (thin layer)
  - `api/services/` – Business logic (core functionality)
  - `api/routes/` – Express route definitions (RouterBroker pattern)
  - `api/integrations/` – External service integrations
    - `channel/` – WhatsApp providers (Baileys, Business API, Evolution)
    - `chatbot/` – AI/Bot integrations (OpenAI, Dify, Typebot, Chatwoot)
    - `event/` – Event systems (WebSocket, RabbitMQ, SQS, NATS, Pusher)
    - `storage/` – File storage (S3, MinIO)
  - `api/dto/` – Data Transfer Objects (simple classes, no decorators)
  - `api/guards/` – Authentication/authorization middleware
  - `api/types/` – TypeScript type definitions
  - `api/repository/` – Data access layer (Prisma)
  - `api/middleware/` – Custom middleware (rate limiting, quality checks)
- **`src/api/services/`** – Anti-ban and new feature services
  - `rate-limiter.service.ts` – Per-contact and global rate limiting
  - `quality-monitor.service.ts` – Template quality score tracking
  - `block-tracker.service.ts` – Block/report detection and suppression
  - `anti-ban.service.ts` – Orchestrates all anti-ban components
  - `analytics.service.ts` – Delivery and quality analytics
  - `campaign.service.ts` – Bulk campaign management
- **`prisma/`** – Database schemas and migrations
  - `postgresql-schema.prisma` / `mysql-schema.prisma` – Provider-specific schemas
  - `postgresql-migrations/` / `mysql-migrations/` – Provider-specific migrations
- **`config/`** – Environment and application configuration
- **`utils/`** – Shared utilities and helper functions
- **`validate/`** – JSONSchema7 validation schemas
- **`exceptions/`** – Custom HTTP exception classes
- **`cache/`** – Redis and local cache implementations

### Build & Deployment
- **`dist/`** – Build output (do not edit directly)
- **`public/`** – Static assets and media files
- **`Docker*`**, **`docker-compose*.yaml`** – Containerization and local development stack

## Build, Test, and Development Commands

### Development Workflow
```bash
# Development server with hot reload
npm run dev:server

# Direct execution for testing
npm start

# Production build and run
npm run build
npm run start:prod
```

### Code Quality
```bash
# Linting and formatting
npm run lint        # ESLint with auto-fix
npm run lint:check  # ESLint check only

# Commit with conventional commits
npm run commit      # Interactive commit with Commitizen
```

### Database Management (PostgreSQL - Self-Hosted Docker)
```bash
# Set database provider first (CRITICAL)
export DATABASE_PROVIDER=postgresql

# Generate Prisma client
npm run db:generate

# Development migrations (with provider sync)
npm run db:migrate:dev      # Unix/Mac
npm run db:migrate:dev:win  # Windows

# Production deployment
npm run db:deploy      # Unix/Mac
npm run db:deploy:win  # Windows

# Database tools
npm run db:studio      # Open Prisma Studio
```

### Docker Development
```bash
# Start local services (Redis, PostgreSQL, etc.)
docker-compose up -d

# Full development stack
docker-compose -f docker-compose.dev.yaml up -d
```

## Coding Standards & Architecture Patterns

### Code Style (Enforced by ESLint + Prettier)
- **TypeScript strict mode** with full type coverage
- **2-space indentation**, single quotes, trailing commas
- **120-character line limit**
- **Import order** via `simple-import-sort`
- **File naming**: `feature.kind.ts` (e.g., `whatsapp.baileys.service.ts`)
- **Naming conventions**:
  - Classes: `PascalCase`
  - Functions/variables: `camelCase`
  - Constants: `UPPER_SNAKE_CASE`
  - Files: `kebab-case.type.ts`

### Architecture Patterns

#### Service Layer Pattern
```typescript
export class ExampleService {
  constructor(private readonly waMonitor: WAMonitoringService) {}

  private readonly logger = new Logger('ExampleService');

  public async create(instance: InstanceDto, data: ExampleDto) {
    // Business logic here
    return { example: { ...instance, data } };
  }

  public async find(instance: InstanceDto): Promise<ExampleDto | null> {
    try {
      const result = await this.waMonitor.waInstances[instance.instanceName].findData();
      return result || null; // Return null on not found (Evolution pattern)
    } catch (error) {
      this.logger.error('Error finding data:', error);
      return null; // Return null on error (Evolution pattern)
    }
  }
}
```

#### Controller Pattern (Thin Layer)
```typescript
export class ExampleController {
  constructor(private readonly exampleService: ExampleService) {}

  public async createExample(instance: InstanceDto, data: ExampleDto) {
    return this.exampleService.create(instance, data);
  }
}
```

#### RouterBroker Pattern
```typescript
export class ExampleRouter extends RouterBroker {
  constructor(...guards: any[]) {
    super();
    this.router.post(this.routerPath('create'), ...guards, async (req, res) => {
      const response = await this.dataValidate<ExampleDto>({
        request: req,
        schema: exampleSchema, // JSONSchema7
        ClassRef: ExampleDto,
        execute: (instance, data) => controller.createExample(instance, data),
      });
      res.status(201).json(response);
    });
  }
}
```

#### DTO Pattern (Simple Classes)
```typescript
// CORRECT - Fidscript API pattern (no decorators)
export class ExampleDto {
  name: string;
  description?: string;
  enabled: boolean;
}

// INCORRECT - Don't use class-validator decorators
export class BadExampleDto {
  @IsString() // ❌ Fidscript API doesn't use decorators
  name: string;
}
```

#### Validation Pattern (JSONSchema7)
```typescript
import { JSONSchema7 } from 'json-schema';
import { v4 } from 'uuid';

export const exampleSchema: JSONSchema7 = {
  $id: v4(),
  type: 'object',
  properties: {
    name: { type: 'string' },
    description: { type: 'string' },
    enabled: { type: 'boolean' },
  },
  required: ['name', 'enabled'],
};
```

## Anti-Ban System Architecture

### Overview
The API includes a comprehensive anti-ban system to protect WhatsApp accounts from restrictions and bans.

### Components

#### 1. Rate Limiter Service
- **Per-contact rate limiting**: 1 message per 6 seconds to same contact
- **Per-instance limiting**: Global throughput limits per WABA
- **Burst control**: Maximum 45 messages in 6-second burst window
- **Hourly limits**: Maximum 600 messages per contact per hour

#### 2. Quality Monitor Service
- **Template quality tracking**: Monitors GREEN/YELLOW/RED scores
- **Webhook handling**: Processes `message_template_quality_update` events
- **Auto-pause**: Automatically pauses templates with RED quality
- **Alerts**: Notifies admins when quality drops

#### 3. Block Tracker Service
- **Block detection**: Identifies when messages fail due to user blocks
- **Auto-suppression**: Suppresses contacts after 3+ blocks
- **Analytics**: Tracks block rates per instance and globally

#### 4. Anti-Ban Orchestrator
- **Unified interface**: Coordinates all anti-ban components
- **Policy enforcement**: Automatic throttling when approaching limits
- **Account health**: Monitors overall account status via webhooks

### Usage
```typescript
// Before sending any message, these checks run automatically:
const canSend = await antiBanService.canSendMessage(instanceId, phoneNumber);
if (!canSend.allowed) {
  return { error: canSend.reason, retryAfter: canSend.retryAfter };
}

// Track message delivery
await antiBanService.recordDelivery(instanceId, messageId, status);
```

## Latest WhatsApp Features

### Supported Message Types

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

## Multi-Tenant Architecture

### Instance Isolation
- **CRITICAL**: All operations must be scoped by `instanceName` or `instanceId`
- **Database queries**: Always include `where: { instanceId: ... }`
- **Authentication**: Validate instance ownership before operations
- **Data isolation**: Complete separation between tenant instances

### WhatsApp Instance Management
```typescript
// Access instance via WAMonitoringService
const waInstance = this.waMonitor.waInstances[instance.instanceName];
if (!waInstance) {
  throw new NotFoundException(`Instance ${instance.instanceName} not found`);
}
```

## Database Patterns

### Multi-Provider Support
- **PostgreSQL**: Uses `@db.Integer`, `@db.JsonB`, `@default(now())`
- **MySQL**: Uses `@db.Int`, `@db.Json`, `@default(now())`
- **Environment**: Set `DATABASE_PROVIDER=postgresql` (recommended for Docker self-hosted)
- **Migrations**: Provider-specific folders auto-selected

### Prisma Repository Pattern
```typescript
// Always use PrismaRepository for database operations
const result = await this.prismaRepository.instance.findUnique({
  where: { name: instanceName },
});
```

### New Anti-Ban Models
```prisma
// Rate limit tracking
model RateLimitState {
  id            String   @id
  instanceId    String
  phoneNumber   String?
  windowStart   DateTime
  messageCount  Int      @default(0)
  blocked       Boolean  @default(false)
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
}

// Template quality tracking
model TemplateQuality {
  id            String   @id
  instanceId    String
  templateName  String
  qualityScore  String   // GREEN, YELLOW, RED
  updatedAt     DateTime @updatedAt
}

// Block event tracking
model BlockEvent {
  id          String   @id
  instanceId  String
  phoneNumber String
  eventType   String   // BLOCKED, REPORTED, SPAMMED
  timestamp   DateTime @default(now())
}

// Suppressed contacts (auto-blocked)
model SuppressedContact {
  id          String   @id
  instanceId  String
  phoneNumber String
  reason      String
  suppressedAt DateTime @default(now())
}
```

## Integration Patterns

### Channel Integration (WhatsApp Providers)
- **Baileys**: WhatsApp Web with QR code authentication
- **Business API**: Official Meta WhatsApp Business API
- **Evolution Channel**: Custom WhatsApp integration
- **Pattern**: Extend base channel service classes

### Chatbot Integration
- **Base classes**: Extend `BaseChatbotService` and `BaseChatbotController`
- **Trigger system**: Support keyword, regex, and advanced triggers
- **Session management**: Handle conversation state per user
- **Available integrations**: EvolutionBot, OpenAI, Dify, Typebot, Chatwoot, Flowise, N8N, EvoAI

### Event Integration
- **Internal events**: EventEmitter2 for application events
- **External events**: WebSocket, RabbitMQ, SQS, NATS, Pusher
- **Webhook delivery**: Reliable delivery with retry logic

## Testing Guidelines

### Current State
- **No formal test suite** currently implemented
- **Manual testing** is the primary approach
- **Integration testing** in development environment

### Testing Strategy
```typescript
// Place tests in test/ directory as *.test.ts
// Run: npm test (watches test/all.test.ts)

describe('ExampleService', () => {
  it('should create example', async () => {
    // Mock external dependencies
    // Test business logic
    // Assert expected behavior
  });
});
```

### Recommended Approach
- Focus on **critical business logic** in services
- **Mock external dependencies** (WhatsApp APIs, databases)
- **Integration tests** for API endpoints
- **Manual testing** for WhatsApp connection flows

## Commit & Pull Request Guidelines

### Conventional Commits (Enforced by commitlint)
```bash
# Use interactive commit tool
npm run commit

# Commit format: type(scope): subject (max 100 chars)
# Types: feat, fix, docs, style, refactor, perf, test, chore, ci, build, revert, security
```

### Examples
- `feat(anti-ban): add rate limiter service`
- `feat(messages): add interactive buttons endpoint`
- `fix(baileys): resolve connection timeout issue`
- `docs(readme): update installation instructions`
- `refactor(service): extract common message validation logic`

### Pull Request Requirements
- **Clear description** of changes and motivation
- **Linked issues** if applicable
- **Migration impact** (specify database provider)
- **Local testing steps** with screenshots/logs
- **Breaking changes** clearly documented

## Security & Configuration

### Environment Setup
```bash
# Copy example environment file
cp .env.example .env

# NEVER commit secrets to version control
# Set DATABASE_PROVIDER before database commands
export DATABASE_PROVIDER=postgresql

# Required environment variables for PostgreSQL Docker:
# DATABASE_URL=postgresql://user:password@localhost:5432/fidscript
# REDIS_URL=redis://localhost:6379
```

### Security Best Practices
- **API key authentication** via `apikey` header
- **Input validation** with JSONSchema7
- **Rate limiting** on all endpoints (built-in anti-ban)
- **Webhook signature validation**
- **Instance-based access control**
- **Secure defaults** for all configurations

### Vulnerability Reporting
- See `SECURITY.md` for security vulnerability reporting process
- Contact: `info@nextmavens.com`

## Communication Standards

### Language Requirements
- **User communication**: Always respond in English
- **Code/comments**: English for technical documentation
- **API responses**: English for consistency
- **Error messages**: English for user-facing errors

### Documentation Standards
- **Inline comments**: Document complex business logic
- **API documentation**: Document all public endpoints
- **Integration guides**: Document new integration patterns
- **Migration guides**: Document database schema changes

## Performance & Scalability

### Caching Strategy
- **Redis primary**: Distributed caching for production (recommended for Docker)
- **Node-cache fallback**: Local caching when Redis unavailable
- **TTL strategy**: Appropriate cache expiration per data type
- **Cache invalidation**: Proper invalidation on data changes

### Connection Management
- **Database**: Prisma connection pooling (PostgreSQL via Docker)
- **WhatsApp**: One connection per instance with lifecycle management
- **Redis**: Connection pooling and retry logic
- **External APIs**: Rate limiting and retry with exponential backoff

### Rate Limiting (Built-in Anti-Ban)
- **Per-contact**: 1 message per 6 seconds (WhatsApp rule)
- **Burst limit**: 45 messages per 6 seconds
- **Hourly limit**: 600 messages per contact
- **Global throughput**: Configurable per WABA tier

### Monitoring & Observability
- **Structured logging**: Pino logger with correlation IDs
- **Error tracking**: Comprehensive error scenarios
- **Health checks**: Instance status and connection monitoring
- **Analytics endpoints**: `/analytics/delivery`, `/analytics/quality`, `/analytics/blocks`
