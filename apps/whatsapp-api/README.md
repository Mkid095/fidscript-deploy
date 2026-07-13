<p align="center">
  <a href="https://nextmavens.com">
    <img src="./public/next-mavens-logo.png" alt="Next Mavens" />
  </a>
</p>

<h1 align="center">Next Mavens Fidscript WhatsApp API</h1>

<p align="center">
  Enterprise-grade WhatsApp Business API Platform — Built on Evolution API, Enhanced by Next Mavens.
</p>

<p align="center">
  <a href="https://github.com/NextMavens/fidscript-whatsapp-api/releases/latest"><img src="https://img.shields.io/github/v/release/NextMavens/fidscript-whatsapp-api?include_prereleases&label=version&color=00ffa7" alt="Latest version" /></a>
  <a href="https://opensource.org/licenses/Apache-2.0"><img src="https://img.shields.io/badge/License-Apache%202.0-blue.svg" alt="License: Apache 2.0" /></a>
  <a href="https://nextmavens.com"><img src="https://img.shields.io/badge/Website-nextmavens.com-00ffa7" alt="Website" /></a>
  <a href="https://fidscript.com"><img src="https://img.shields.io/badge/Product-Fidscript-00ffa7" alt="Fidscript" /></a>
</p>

<p align="center">
  <a href="https://nextmavens.com">Website</a> &middot;
  <a href="mailto:info@nextmavens.com">Support</a> &middot;
  <a href="https://fidscript.com">Fidscript</a>
</p>

---

## About

**Next Mavens Fidscript WhatsApp API** is an enterprise-grade, production-ready REST API for WhatsApp messaging. Built as a customized fork of Evolution API, enhanced with advanced features including anti-ban protection, latest WhatsApp message types, and enterprise security.

This platform enables businesses to send and receive WhatsApp messages programmatically via a REST API, with built-in protection against account bans, quality monitoring, and support for the latest WhatsApp Business features.

## Key Features

### Enterprise Anti-Ban System
- **Rate Limiting**: Per-contact and per-instance rate limiting to prevent spam detection
- **Quality Monitoring**: Real-time template quality score tracking
- **Block Detection**: Automatic tracking and suppression of contacts with high block rates
- **Policy Enforcement**: Webhook-based account health monitoring

### Latest WhatsApp Message Types
- Interactive Reply Buttons
- Interactive List Messages
- Product Catalog Messages
- Product Carousel Messages
- WhatsApp Flows (Interactive Forms)
- Polls and Voting
- Message Editing
- Disappearing Messages

### Multi-Provider Support
- **Baileys**: WhatsApp Web API (free, based on linked device)
- **Meta Business API**: Official WhatsApp Business API (Cloud API)
- **Evolution Channel**: Custom integration support

---

## Quick Start

### Prerequisites

- **Node.js** 20+
- **PostgreSQL** 14+ (recommended) or MySQL 8+
- **Redis** (recommended for caching)

### Installation

```bash
git clone git@github.com:NextMavens/fidscript-whatsapp-api.git
cd fidscript-whatsapp-api

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env with your database and Redis settings
```

### Database Setup

```bash
# Set the database provider
export DATABASE_PROVIDER=postgresql

# Generate Prisma client
npm run db:generate

# Deploy migrations
npm run db:deploy
```

### Running

```bash
# Development with hot reload
npm run dev:server

# Production build and run
npm run build
npm run start:prod
```

### Docker

```bash
# Pull the image
docker pull nextmavens/fidscript-whatsapp-api:latest

# Run with environment file
docker run -p 8080:8080 --env-file .env nextmavens/fidscript-whatsapp-api:latest
```

### Docker Compose (Recommended for Self-Hosted)

```bash
# Start PostgreSQL, Redis, and the API
docker-compose up -d
```

---

## Enterprise Features

### Anti-Ban Protection

The API includes built-in protection against WhatsApp account bans:

```typescript
// Rate limiting is automatic
// Check account health
GET /anti-ban/status

// Get rate limit information
GET /anti-ban/limits

// Manually pause a template
POST /anti-ban/pause-template
```

### Analytics & Monitoring

```typescript
// Get delivery analytics
GET /analytics/delivery

// Get template quality scores
GET /analytics/quality

// Get block rate tracking
GET /analytics/blocks
```

### Campaign Management

```typescript
// Create a bulk campaign
POST /campaigns/create

// Check campaign status
GET /campaigns/:id/status

// Pause/Resume campaign
POST /campaigns/:id/pause
POST /campaigns/:id/resume
```

---

## API Endpoints Overview

### Instance Management
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/instance/create` | Create a new WhatsApp instance |
| GET | `/instance/connect/:name` | Generate QR code for connection |
| GET | `/instance/connectionState/:name` | Get connection status |
| DELETE | `/instance/logout/:name` | Disconnect instance |

### Message Sending
| Method | Endpoint | Tokens |
|--------|----------|--------|
| POST | `/message/sendText/:name` | 1 |
| POST | `/message/sendMedia/:name` | 2-4 |
| POST | `/message/sendButtons/:name` | 2 |
| POST | `/message/sendList/:name` | 2 |
| POST | `/message/sendCatalog/:name` | 3 |
| POST | `/message/sendCarousel/:name` | 3 |

### Analytics
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/analytics/delivery` | Delivery rates |
| GET | `/analytics/quality` | Template quality |
| GET | `/analytics/blocks` | Block tracking |
| GET | `/analytics/rate-limits` | Rate limit status |

---

## Architecture

```
Client / CRM / Application
         ↓
Next Mavens Fidscript WhatsApp API
  ├── Anti-Ban System (Rate Limiter, Quality Monitor, Block Tracker)
  ├── Channel Integrations (Baileys / Meta Business API)
  ├── Event Integrations (WebSocket, Webhooks, Queues)
  └── Storage Integrations (S3, MinIO)
         ↓
    WhatsApp Network
```

Built with **Node.js 20+**, **TypeScript 5+**, **Express.js**, and **Prisma ORM**.

---

## Technology Stack

- **Runtime**: Node.js 20+
- **Language**: TypeScript 5+
- **Framework**: Express.js
- **Database**: PostgreSQL / MySQL via Prisma ORM
- **Cache**: Redis + Node-cache
- **WhatsApp**: Baileys (Web) + Meta Business API
- **Container**: Docker

---

## Documentation

| Resource | Link |
|---|---|
| Website | [nextmavens.com](https://nextmavens.com) |
| Product | [fidscript.com](https://fidscript.com) |
| Support | [info@nextmavens.com](mailto:info@nextmavens.com) |

---

## Built On

- [Evolution API](https://github.com/evolution-foundation/evolution-api) — Core WhatsApp engine
- [Baileys](https://github.com/WhiskeySockets/Baileys) — WhatsApp Web library
- [Meta WhatsApp Business API](https://developers.facebook.com/docs/whatsapp) — Official Business API

---

## Contributing

Contributions are welcome! Please open an issue or submit a pull request.

For major changes, please open an issue first to discuss what you would like to change.

---

## License

Licensed under the Apache License 2.0. See [LICENSE](./LICENSE) for details.

---

## Trademarks

"Next Mavens", "Fidscript", and related marks are trademarks of Next Mavens. All other trademarks are the property of their respective owners.

---

<p align="center">
  Made by <a href="https://nextmavens.com">Next Mavens</a> &middot; © 2026
</p>
