# WhatsApp Service Integration Guide

## Overview

The **Next Mavens Fidscript WhatsApp API** is a centralized WhatsApp messaging service integrated into the Fidscript platform. It provides enterprise-grade WhatsApp Business API capabilities with built-in anti-ban protection, campaign management, and comprehensive analytics.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     Fidscript Platform                           │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐ │
│  │  Dashboard  │  │   API       │  │   WhatsApp Service       │ │
│  │             │◄─┤   Console   │◄─┤   (apps/whatsapp-api)    │ │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                                              │
                    ┌─────────────────────────┼─────────────────────────┐
                    │                         │                         │
              ┌─────▼─────┐           ┌───────▼───────┐         ┌──────▼──────┐
              │  Baileys  │           │  WhatsApp     │         │   Anti-Ban  │
              │  Channel  │           │  Business API │         │   Service   │
              └─────┬─────┘           └───────┬───────┘         └──────┬───────┘
                    │                         │                        │
                    └─────────────────────────┼────────────────────────┘
                                              │
                                      ┌───────▼───────┐
                                      │   WhatsApp    │
                                      │   Network     │
                                      └───────────────┘
```

## Service Location

The WhatsApp service is located at:
```
{fidscript-deploy}/apps/whatsapp-api/
```

## Features

### Core Features

| Feature | Description |
|---------|-------------|
| **Multi-Instance Support** | Run multiple WhatsApp instances simultaneously |
| **Baileys Integration** | WhatsApp Web protocol implementation |
| **WhatsApp Business API** | Official Meta Business API integration |
| **Anti-Ban Protection** | Rate limiting, quality monitoring, block tracking |
| **Campaign Management** | Bulk messaging with anti-ban safeguards |
| **Analytics** | Comprehensive message and instance analytics |
| **Chatwoot Integration** | Inbox management for conversations |
| **Webhook Events** | Real-time event notifications |

### Supported Message Types

| Type | Endpoint | Description |
|------|----------|-------------|
| Text | `POST /message/sendText` | Simple text messages |
| Media | `POST /message/sendMedia` | Images, videos, documents |
| Audio | `POST /message/sendWhatsAppAudio` | Audio messages |
| Sticker | `POST /message/sendSticker` | Sticker messages |
| Location | `POST /message/sendLocation` | Location sharing |
| Contact | `POST /message/sendContact` | Contact card sharing |
| Reaction | `POST /message/sendReaction` | Emoji reactions |
| Poll | `POST /message/sendPoll` | Polls with selectable options |
| Buttons | `POST /message/sendButtons` | Interactive buttons |
| List | `POST /message/sendList` | Interactive list messages |
| Interactive Buttons | `POST /message/sendInteractiveButtons` | WhatsApp Business buttons |
| Product | `POST /message/sendProduct` | Product from catalog |
| Product Carousel | `POST /message/sendProductCarousel` | Product carousel |
| Flow | `POST /message/sendFlow` | WhatsApp Flow messages |
| Status | `POST /message/sendStatus` | Status updates |

## Quick Start

### 1. Environment Setup

Copy the environment template:
```bash
cd apps/whatsapp-api
cp .env.example .env
```

Configure your `.env` file:
```env
# Server Configuration
PROTOCOL=http
PORT=8080
HOST=0.0.0.0

# Database Configuration
DATABASE_PROVIDER=postgresql
DATABASE_URL=postgresql://user:password@localhost:5432/fidscript_whatsapp

# Redis Configuration (Required for Anti-Ban)
REDIS_URI=redis://localhost:6379

# WhatsApp Configuration
WHATSAPP_SESSION_PATH=./.sessions

# Authentication
AUTHENTICATION_API_KEY=true
API_KEY_NAME=apikey
API_KEY_SECRET=your-secret-key

# Anti-Ban Configuration
ANTI_BAN_ENABLED=true
RATE_LIMIT_CONTACT_MS=6000
RATE_LIMIT_CONTACT_HOURLY=600
RATE_LIMIT_BURST=45
BLOCK_THRESHOLD=5
SUPPRESSION_TTL_DAYS=30

# Chatwoot (Optional)
CHATWOOT_ENABLED=false

# Webhook
WEBHOOK_GLOBAL_URL=https://your-fidscript-server.com/webhook
```

### 2. Database Setup

```bash
# Generate Prisma client
npm run db:generate

# Run migrations
npm run db:migrate:dev:win  # Windows
npm run db:migrate:dev      # Unix/Mac
```

### 3. Start the Service

```bash
# Development mode with hot reload
npm run dev:server

# Production mode
npm run build
npm run start:prod
```

### 4. Verify Service Health

```bash
curl http://localhost:8080/health
```

## Instance Management

### Create a New Instance

```bash
curl -X POST http://localhost:8080/instance/create \
  -H "Content-Type: application/json" \
  -H "apikey: your-api-key" \
  -d '{
    "instanceName": "my-whatsapp-instance",
    "integration": "WHATSAPP-BAILEY"
  }'
```

### Connect via QR Code

For Baileys instances, fetch the QR code:
```bash
curl http://localhost:8080/instance/connect/my-whatsapp-instance \
  -H "apikey: your-api-key"
```

### Instance Response Structure

```json
{
  "instance": {
    "instanceName": "my-whatsapp-instance",
    "instanceId": "abc123-def456",
    "integration": "WHATSAPP-BAILEY",
    "status": "open"
  },
  "hash": {
    "watermark": "eyJ...",
    "certificate": "eyJ..."
  }
}
```

## Authentication

All API requests require authentication via API key.

### Header Authentication

```bash
curl -H "apikey: your-api-key" http://localhost:8080/instance/find
```

### Query Parameter Authentication

```bash
curl http://localhost:8080/instance/find?apikey=your-api-key
```

## Contact Handling

### How Contacts Work

The WhatsApp service uses JID (Jabber ID) for contact identification:

| Format | Description | Example |
|--------|-------------|---------|
| User | Personal chat | `5511999999999@s.whatsapp.net` |
| Group | Group chat | `5511999999999-987654321@g.us` |
| LID | Legacy ID | `abcdef123@lid` |

### JID Creation

The service automatically converts phone numbers to JIDs:

```typescript
// Input: 5511999999999
// Output: 5511999999999@s.whatsapp.net
```

### WhatsApp Number Verification

Verify if a number is on WhatsApp:
```bash
curl -X POST http://localhost:8080/chat/whatsappNumber \
  -H "apikey: your-api-key" \
  -H "Content-Type: application/json" \
  -d '{
    "numbers": ["5511888888888", "5511999999999"]
  }'
```

## Message Sending

### Send Text Message

```bash
curl -X POST http://localhost:8080/message/sendText/my-whatsapp-instance \
  -H "apikey: your-api-key" \
  -H "Content-Type: application/json" \
  -d '{
    "number": "5511888888888",
    "text": "Hello from Fidscript!"
  }'
```

### Send Media Message

```bash
curl -X POST http://localhost:8080/message/sendMedia/my-whatsapp-instance \
  -H "apikey: your-api-key" \
  -H "Content-Type: application/json" \
  -d '{
    "number": "5511888888888",
    "mediatype": "image",
    "media": "https://example.com/image.jpg",
    "caption": "Check this out!"
  }'
```

### Send with Quote/Reply

```bash
curl -X POST http://localhost:8080/message/sendText/my-whatsapp-instance \
  -H "apikey: your-api-key" \
  -H "Content-Type: application/json" \
  -d '{
    "number": "5511888888888",
    "text": "Replying to your message",
    "quoted": {
      "key": {
        "remoteJid": "5511888888888@s.whatsapp.net",
        "fromMe": false,
        "id": "BAE1234567890ABCD"
      }
    }
  }'
```

## Webhook Integration

### Configure Webhook

```bash
curl -X POST http://localhost:8080/webhook/set/my-whatsapp-instance \
  -H "apikey: your-api-key" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://your-fidscript-server.com/whatsapp-webhook",
    "webhookByEvents": true,
    "events": [
      "MESSAGES_UPSERT",
      "MESSAGES_UPDATE",
      "CONNECTION_UPDATE"
    ]
  }'
```

### Webhook Events

| Event | Description |
|-------|-------------|
| `MESSAGES_UPSERT` | New message received |
| `MESSAGES_UPDATE` | Message status updated |
| `MESSAGES_EDITED` | Message was edited |
| `MESSAGES_DELETE` | Message was deleted |
| `SEND_MESSAGE` | Outbound message sent |
| `CONNECTION_UPDATE` | Connection state changed |
| `CONTACTS_UPSERT` | New contact added |
| `CHATS_SET` | Chat list synced |
| `QRCODE_UPDATED` | QR code generated |

### Webhook Payload Structure

```json
{
  "event": "MESSAGES_UPSERT",
  "instance": "my-whatsapp-instance",
  "data": {
    "key": {
      "remoteJid": "5511999999999@s.whatsapp.net",
      "fromMe": false,
      "id": "BAE1234567890ABCD"
    },
    "pushName": "John Doe",
    "message": {
      "conversation": "Hello!"
    },
    "messageType": "conversation",
    "messageTimestamp": "1700000000",
    "status": "PENDING"
  },
  "date_time": "2024-01-01T12:00:00.000Z"
}
```

## Anti-Ban System

The Anti-Ban system protects your WhatsApp account from being banned by implementing rate limiting and quality monitoring.

### Anti-Ban Configuration

```env
ANTI_BAN_ENABLED=true
RATE_LIMIT_CONTACT_MS=6000      # 6 seconds between messages
RATE_LIMIT_CONTACT_HOURLY=600   # Max 600 messages per hour
RATE_LIMIT_BURST=45              # Max 45 messages in burst
BLOCK_THRESHOLD=5                # Number of blocks before suppression
QUALITY_ALERT_THRESHOLD=YELLOW   # Alert when quality drops to YELLOW
AUTO_PAUSE_ON_RED_DAYS=2        # Auto-pause after 2 consecutive RED days
```

### Check Anti-Ban Status

```bash
curl http://localhost:8080/anti-ban/status/my-whatsapp-instance \
  -H "apikey: your-api-key"
```

### Response

```json
{
  "instanceName": "my-whatsapp-instance",
  "antiBan": {
    "enabled": true,
    "rateLimiter": {
      "contactLimitMs": 6000,
      "contactHourlyLimit": 600,
      "burstLimit": 45,
      "globalThroughput": 100
    },
    "qualityMonitor": {
      "currentQuality": "GREEN",
      "messageCount": 150,
      "blockCount": 0,
      "lastBlockDate": null
    },
    "blockTracker": {
      "currentBlockedCount": 0,
      "suppressedContacts": []
    }
  }
}
```

### Check if Can Send Message

```bash
curl http://localhost:8080/anti-ban/canSend/my-whatsapp-instance \
  -H "apikey: your-api-key" \
  -H "Content-Type: application/json" \
  -d '{
    "number": "5511888888888"
  }'
```

## Campaign Management

### Create Campaign

```bash
curl -X POST http://localhost:8080/campaign/create \
  -H "apikey: your-api-key" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Marketing Campaign 2024",
    "instanceName": "my-whatsapp-instance",
    "scheduledAt": "2024-01-15T10:00:00.000Z"
  }'
```

### Add Recipients

```bash
curl -X POST http://localhost:8080/campaign/addRecipients \
  -H "apikey: your-api-key" \
  -H "Content-Type: application/json" \
  -d '{
    "campaignId": "campaign-123",
    "numbers": [
      "5511888888888",
      "5511999999999",
      "5511777777777"
    ]
  }'
```

### Send Campaign

```bash
curl -X POST http://localhost:8080/campaign/send \
  -H "apikey: your-api-key" \
  -H "Content-Type: application/json" \
  -d '{
    "campaignId": "campaign-123",
    "message": {
      "text": "Hello! Check out our new products."
    }
  }'
```

The campaign service automatically:
- Checks anti-ban status before each message
- Implements rate limiting between messages
- Tracks message delivery status
- Pauses on quality degradation

## Chatwoot Integration

Chatwoot provides inbox management for handling WhatsApp conversations.

### Configure Chatwoot

```bash
curl -X POST http://localhost:8080/chatwoot/set \
  -H "apikey: your-api-key" \
  -H "Content-Type: application/json" \
  -d '{
    "accountId": "123",
    "token": "your-chatwoot-token",
    "url": "https://chat.example.com",
    "signMsg": true,
    "nameInbox": "WhatsApp Support"
  }'
```

### Chatwoot Events Flow

```
WhatsApp User → Message → WhatsApp API → Chatwoot → Fidscript Dashboard
                                    ↓
                              Webhook also sent
```

## Analytics

### Get Instance Statistics

```bash
curl http://localhost:8080/analytics/instance/my-whatsapp-instance \
  -H "apikey: your-api-key"
```

### Get Message Statistics

```bash
curl http://localhost:8080/analytics/messages \
  -H "apikey: your-api-key" \
  -H "Content-Type: application/json" \
  -d '{
    "instanceName": "my-whatsapp-instance",
    "startDate": "2024-01-01",
    "endDate": "2024-01-31"
  }'
```

## Error Handling

### Error Response Format

```json
{
  "status": 400,
  "message": "Invalid phone number format",
  "error": "Bad Request"
}
```

### Common Error Codes

| Status | Error | Description |
|--------|-------|-------------|
| 400 | Bad Request | Invalid request parameters |
| 401 | Unauthorized | Invalid or missing API key |
| 404 | Not Found | Instance or resource not found |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | Server error |

### Rate Limit Handling

When rate limited, wait for the specified time:
```json
{
  "status": 429,
  "message": "Rate limit exceeded. Wait 6 seconds.",
  "retryAfter": 6000
}
```

## Testing

### Run Tests

```bash
cd apps/whatsapp-api
npm test
```

### Test Webhook Endpoint

Use a tool like ngrok to expose your local server:

```bash
ngrok http 8080
```

Then configure your webhook URL to the ngrok URL.

## Next Steps

- Read the [Deployment Guide](./WHATSAPP_DEPLOYMENT.md) for production setup
- Review the [API Reference](./WHATSAPP_API_REFERENCE.md) for complete endpoint documentation
- See [Webhook Guide](./WHATSAPP_WEBHOOK_GUIDE.md) for detailed webhook integration
