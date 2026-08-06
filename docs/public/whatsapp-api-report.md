# WhatsApp Evolution API — Comprehensive System Report

**Date:** 2026-08-05  
**System:** Next Mavens Fidscript WhatsApp API (built on Evolution API)  
**Domain Target:** `whatsappapi.fidscript.com`  
**Version:** 1.0.0

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [Complete API Endpoint Reference](#2-complete-api-endpoint-reference)
3. [Authentication](#3-authentication)
4. [Public API Exposure via whatsappapifidscriptcom](#4-public-api-exposure-via-whatsappapifidscriptcom)
5. [External System Integration Guide](#5-external-system-integration-guide)
6. [Traefik Configuration](#6-traefik-configuration)
7. [Next Steps](#7-next-steps)

---

## 1. System Overview

### What Is Running

| Component | Detail |
|-----------|--------|
| **Product** | Next Mavens Fidscript WhatsApp API |
| **Base** | Evolution API (enterprise WhatsApp API platform) |
| **Enhancements** | Anti-Ban system, Campaign management, Analytics, Quality monitoring |
| **Runtime** | Node.js 20+ / TypeScript / Express.js |
| **Database** | PostgreSQL 16 (via Prisma ORM) |
| **Cache** | Redis 7 |
| **Container** | Docker with `nextmavens/fidscript-whatsapp-api:latest` |
| **API Port** | `127.0.0.1:8080` (internal) |
| **Manager UI** | `nextmavens/fidscript-manager:latest` on port 3000 |
| **API Key Auth** | Header `apikey: YOUR_API_KEY` |

### Docker Compose Location

```
/home/ken/fidscript-deploy/apps/whatsapp-api/docker-compose.yaml
```

### Current Endpoints Base URL (Internal)

```
http://fidscript_api:8080
```

### Architecture

```
Client / CRM / External Application
         ↓
    Traefik Proxy (whatsappapi.fidscript.com)
         ↓
Next Mavens Fidscript WhatsApp API
  ├── Anti-Ban System (Rate Limiter, Quality Monitor, Block Tracker)
  ├── Channel Integrations (Baileys / Meta Business API)
  ├── Event Integrations (WebSocket, Webhooks, Queues)
  ├── Campaign Engine (Scheduled + Immediate)
  └── Analytics Service
         ↓
    WhatsApp Network
```

### Key Features

- **Anti-Ban Protection**: Automatic rate limiting, quality monitoring, block detection
- **Multi-Message Types**: Text, Media, Buttons, Lists, Product Catalog, Carousels, Flows, Polls
- **Campaign Management**: Schedule bulk campaigns with anti-ban protection
- **Analytics**: Real-time and historical message analytics
- **Multi-Provider**: Baileys (WhatsApp Web), Meta Business API

---

## 2. Complete API Endpoint Reference

All endpoints require `apikey` header unless noted. Instance-scoped routes take `instanceName` as path parameter.

### 2.1 System & Info

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/` | None | API info, version, anti-ban status, WhatsApp Web version |
| `GET` | `/metrics` | Basic Auth or IP whitelist | Prometheus metrics endpoint |
| `POST` | `/verify-creds` | API Key | Verify Facebook/Meta credentials validity |
| `GET` | `/assets/*` | None | Static assets for manager UI |

**Example - API Info:**
```bash
curl https://whatsappapi.fidscript.com/
```

**Response:**
```json
{
  "status": 200,
  "message": "Welcome to Next Mavens Fidscript WhatsApp API, it is working!",
  "version": "1.0.0",
  "clientName": "fidscript",
  "documentation": "https://nextmavens.com/docs",
  "antiBan": {
    "enabled": true,
    "healthEndpoint": "/anti-ban/health",
    "statusEndpoint": "/anti-ban/status"
  },
  "whatsappWebVersion": "2.24.XX.X"
}
```

---

### 2.2 Instance Management

Manage WhatsApp connection instances (create, connect, disconnect, delete).

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/instance/create` | API Key | Create new WhatsApp instance |
| `GET` | `/instance/connect/:instanceName` | API Key | Generate QR code for WhatsApp connection |
| `GET` | `/instance/connectionState/:instanceName` | API Key | Get current connection status |
| `POST` | `/instance/restart/:instanceName` | API Key | Restart instance connection |
| `DELETE` | `/instance/logout/:instanceName` | API Key | Disconnect instance from WhatsApp |
| `DELETE` | `/instance/delete/:instanceName` | API Key | Permanently delete instance |
| `POST` | `/instance/setPresence/:instanceName` | API Key | Set presence (online/away) |
| `GET` | `/instance/fetchInstances` | API Key | List all instances (no instanceName param) |

#### Create Instance

```bash
curl -X POST "https://whatsappapi.fidscript.com/instance/create" \
  -H "apikey: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "instanceName": "my_business",
    "integration": "WHATSAPP-BAILEY"
  }'
```

#### Generate QR Code

```bash
curl -X GET "https://whatsappapi.fidscript.com/instance/connect/my_business" \
  -H "apikey: YOUR_API_KEY"
```

**Response:**
```json
{
  "qrcode": {
    "code": "data:image/png;base64,...",
    "base64": "..."
  }
}
```

#### Connection States

The `connectionState` endpoint returns one of:
- `connecting` - Connection in progress
- `open` - Successfully connected
- `close` - Disconnected
- `error` - Connection error

---

### 2.3 Message Sending

All message endpoints include **anti-ban protection** (rate limiting, quality monitoring).

#### 2.3.1 Basic Messages

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/message/sendText/:instanceName` | Send text message with optional link preview |
| `POST` | `/message/sendMedia/:instanceName` | Send image, video, document, or audio |
| `POST` | `/message/sendAudio/:instanceName` | Send audio file (WhatsApp-specific) |
| `POST` | `/message/sendSticker/:instanceName` | Send sticker |
| `POST` | `/message/sendLocation/:instanceName` | Send location with name and address |
| `POST` | `/message/sendContact/:instanceName` | Send contact card(s) |
| `POST` | `/message/sendReaction/:instanceName` | React to a message with emoji |
| `POST` | `/message/sendPoll/:instanceName` | Send poll/voting message |

##### Send Text Message

```bash
curl -X POST "https://whatsappapi.fidscript.com/message/sendText/my_business" \
  -H "apikey: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "number": "254712345678",
    "text": "Hello! This is a test message.",
    "delay": 1000,
    "linkPreview": true
  }'
```

##### Send Media Message

```bash
curl -X POST "https://whatsappapi.fidscript.com/message/sendMedia/my_business" \
  -H "apikey: YOUR_API_KEY" \
  -F "number=254712345678" \
  -F "mediatype=image" \
  -F "file=@/path/to/image.jpg" \
  -F "caption=Check out this image!"
```

Or with media URL:

```bash
curl -X POST "https://whatsappapi.fidscript.com/message/sendMedia/my_business" \
  -H "apikey: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "number": "254712345678",
    "mediatype": "image",
    "media": "https://example.com/image.jpg",
    "caption": "Check out this image!"
  }'
```

##### Send Location

```bash
curl -X POST "https://whatsappapi.fidscript.com/message/sendLocation/my_business" \
  -H "apikey: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "number": "254712345678",
    "latitude": -1.286389,
    "longitude": 36.817223,
    "name": "Nairobi CBD",
    "address": "Kenyatta Avenue, Nairobi, Kenya"
  }'
```

##### Send Poll

```bash
curl -X POST "https://whatsappapi.fidscript.com/message/sendPoll/my_business" \
  -H "apikey: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "number": "254712345678",
    "name": "Team Lunch Vote",
    "selectableCount": 1,
    "values": ["Pizza", "Sushi", "Burger", "Salad"]
  }'
```

#### 2.3.2 Interactive Messages (Latest WhatsApp Business API)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/message/sendButtons/:instanceName` | Send reply buttons (up to 3 buttons) |
| `POST` | `/message/sendList/:instanceName` | Send list message with sections/rows |
| `POST` | `/message/sendInteractiveButtons/:instanceName` | Newer interactive buttons format |
| `POST` | `/message/sendProduct/:instanceName` | Send single product from catalog |
| `POST` | `/message/sendProductCarousel/:instanceName` | Send product carousel (up to 10 products) |
| `POST` | `/message/sendFlow/:instanceName` | Send WhatsApp Flow (interactive forms) |

##### Send Buttons

```bash
curl -X POST "https://whatsappapi.fidscript.com/message/sendButtons/my_business" \
  -H "apikey: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "number": "254712345678",
    "title": "What would you like to do?",
    "description": "Select an option below",
    "buttons": [
      {"type": "reply", "displayText": "View Products"},
      {"type": "reply", "displayText": "Talk to Support"},
      {"type": "url", "displayText": "Visit Website", "url": "https://example.com"}
    ]
  }'
```

##### Send List Message

```bash
curl -X POST "https://whatsappapi.fidscript.com/message/sendList/my_business" \
  -H "apikey: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "number": "254712345678",
    "title": "Product Categories",
    "description": "Browse our product catalog",
    "buttonText": "View Categories",
    "sections": [
      {
        "title": "Electronics",
        "rows": [
          {"title": "Smartphones", "description": "Latest flagship phones", "rowId": "phones"},
          {"title": "Laptops", "description": "Business & gaming laptops", "rowId": "laptops"}
        ]
      },
      {
        "title": "Accessories",
        "rows": [
          {"title": "Headphones", "description": "Wireless & wired", "rowId": "headphones"},
          {"title": "Chargers", "description": "Fast charging solutions", "rowId": "chargers"}
        ]
      }
    ]
  }'
```

##### Send Product Carousel

```bash
curl -X POST "https://whatsappapi.fidscript.com/message/sendProductCarousel/my_business" \
  -H "apikey: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "number": "254712345678",
    "header": {"text": "Featured Products"},
    "body": {"text": "Check out these amazing deals!"},
    "catalogId": "CATALOG_ID_HERE",
    "productItems": [
      {
        "productId": "PROD_001",
        "title": "iPhone 15 Pro",
        "description": "Latest Apple flagship",
        "price": "$999",
        "currency": "USD"
      },
      {
        "productId": "PROD_002",
        "title": "Samsung Galaxy S24",
        "description": "Android powerhouse",
        "price": "$899",
        "currency": "USD"
      }
    ]
  }'
```

#### 2.3.3 Status & Special

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/message/sendStatus/:instanceName` | Send status update (Story) |
| `POST` | `/message/sendTemplate/:instanceName` | Send WhatsApp Business template |
| `POST` | `/message/sendPtv/:instanceName` | Send picture video (ptv) |

##### Send Template

```bash
curl -X POST "https://whatsappapi.fidscript.com/message/sendTemplate/my_business" \
  -H "apikey: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "number": "254712345678",
    "name": "hello_world",
    "language": "en",
    "components": [
      {
        "type": "header",
        "parameters": [{"type": "text", "text": "John"}]
      },
      {
        "type": "body",
        "parameters": [
          {"type": "text", "text": "John"},
          {"type": "text", "text": "2026-08-15"}
        ]
      }
    ]
  }'
```

---

### 2.4 Chat Operations

Manage conversations, messages, and profile.

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/chat/whatsappNumbers/:instanceName` | Check if number is on WhatsApp |
| `POST` | `/chat/findContacts/:instanceName` | Search/fetch contacts |
| `POST` | `/chat/findChats/:instanceName` | Search/fetch conversations |
| `POST` | `/chat/findMessages/:instanceName` | Search messages |
| `POST` | `/chat/findStatusMessage/:instanceName` | Find status messages |
| `GET` | `/chat/findChatByRemoteJid/:instanceName` | Get chat by JID (query param) |
| `POST` | `/chat/markMessageAsRead/:instanceName` | Mark message(s) as read |
| `POST` | `/chat/archiveChat/:instanceName` | Archive a chat |
| `POST` | `/chat/markChatUnread/:instanceName` | Mark chat as unread |
| `DELETE` | `/chat/deleteMessageForEveryone/:instanceName` | Delete message for everyone |
| `POST` | `/chat/updateMessage/:instanceName` | Edit sent message |
| `POST` | `/chat/getBase64FromMediaMessage/:instanceName` | Get media as base64 |

#### 2.4.1 Profile Management

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/chat/fetchProfile/:instanceName` | Get contact profile |
| `POST` | `/chat/fetchProfilePictureUrl/:instanceName` | Get profile picture URL |
| `POST` | `/chat/fetchBusinessProfile/:instanceName` | Get WhatsApp Business profile |
| `POST` | `/chat/updateProfileName/:instanceName` | Update display name |
| `POST` | `/chat/updateProfileStatus/:instanceName` | Update "about" status |
| `POST` | `/chat/updateProfilePicture/:instanceName` | Set profile picture |
| `DELETE` | `/chat/removeProfilePicture/:instanceName` | Remove profile picture |

#### 2.4.2 Privacy & Blocking

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/chat/fetchPrivacySettings/:instanceName` | Get privacy settings |
| `POST` | `/chat/updatePrivacySettings/:instanceName` | Update privacy settings |
| `POST` | `/chat/updateBlockStatus/:instanceName` | Block/unblock contact |
| `POST` | `/chat/sendPresence/:instanceName` | Send presence update |

---

### 2.5 Group Management

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/group/create/:instanceName` | Create group |
| `POST` | `/group/updateGroupSubject/:instanceName` | Update group name |
| `POST` | `/group/updateGroupDescription/:instanceName` | Update group description |
| `POST` | `/group/updateGroupPicture/:instanceName` | Set group photo |
| `POST` | `/group/updateParticipant/:instanceName` | Add/remove/promote participants |
| `POST` | `/group/updateSetting/:instanceName` | Update group settings |
| `POST` | `/group/toggleEphemeral/:instanceName` | Toggle disappearing messages |
| `GET` | `/group/findGroupInfos/:instanceName` | Get group info |
| `GET` | `/group/fetchAllGroups/:instanceName` | List all groups |
| `GET` | `/group/participants/:instanceName` | Get group participants |
| `GET` | `/group/inviteCode/:instanceName` | Get group invite code |
| `GET` | `/group/inviteInfo/:instanceName` | Get invite code info |
| `GET` | `/group/acceptInviteCode/:instanceName` | Join group via invite code |
| `POST` | `/group/sendInvite/:instanceName` | Send group invite to contacts |
| `POST` | `/group/revokeInviteCode/:instanceName` | Revoke group invite code |
| `DELETE` | `/group/leaveGroup/:instanceName` | Leave group |

#### Create Group

```bash
curl -X POST "https://whatsappapi.fidscript.com/group/create/my_business" \
  -H "apikey: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "subject": "Sales Team Kenya",
    "participants": ["254712345678", "254723456789"]
  }'
```

---

### 2.6 Campaign Management

Bulk messaging with anti-ban protection and scheduling.

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/campaign/create/:instanceName` | Create campaign (metadata only) |
| `POST` | `/campaign/schedule/:instanceName` | Schedule campaign for future |
| `POST` | `/campaign/send/:instanceName` | Send campaign immediately |
| `GET` | `/campaign/status/:campaignId` | Get campaign status |
| `GET` | `/campaign/list` | List all campaigns |
| `POST` | `/campaign/pause/:campaignId` | Pause running campaign |
| `POST` | `/campaign/resume/:campaignId` | Resume paused campaign |
| `POST` | `/campaign/cancel/:campaignId` | Cancel campaign |
| `DELETE` | `/campaign/delete/:campaignId` | Delete campaign |

#### Create and Send Campaign

```bash
# Create campaign
curl -X POST "https://whatsappapi.fidscript.com/campaign/create/my_business" \
  -H "apikey: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Summer Sale 2026",
    "description": "Promotional campaign for summer collection"
  }'

# Send immediately
curl -X POST "https://whatsappapi.fidscript.com/campaign/send/my_business" \
  -H "apikey: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Summer Sale 2026",
    "message": {
      "type": "text",
      "text": "Hello {{name}}! Check out our amazing summer deals at {{link}}"
    },
    "recipients": [
      {"phone": "254712345678", "variables": {"name": "John", "link": "https://shop.example.com/summer"}},
      {"phone": "254723456789", "variables": {"name": "Jane", "link": "https://shop.example.com/summer"}}
    ],
    "maxPerMinute": 20
  }'
```

#### Campaign Status Response

```json
{
  "campaignId": "camp_abc123",
  "status": "running",
  "sent": 150,
  "failed": 2,
  "pending": 48,
  "blocked": 0,
  "rateLimited": 5
}
```

---

### 2.7 Anti-Ban System

Account protection via rate limiting, quality monitoring, and block tracking.

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/anti-ban/health` | Overall anti-ban system health |
| `GET` | `/anti-ban/status` | Account health (query: instance) |
| `GET` | `/anti-ban/rate-limit/:instance/:phone` | Check rate limit for contact |
| `GET` | `/anti-ban/template/:name` | Get template quality status |
| `GET` | `/anti-ban/contact/:instance/:phone` | Get contact block/suppression stats |
| `GET` | `/anti-ban/suppressed/:instance` | List all suppressed contacts |
| `POST` | `/anti-ban/pause-template` | Manually pause a template |
| `POST` | `/anti-ban/resume-template` | Resume a paused template |
| `POST` | `/anti-ban/unsubscribe` | Opt-out contact |
| `POST` | `/anti-ban/resubscribe` | Re-subscribe opt-out contact |

#### Rate Limit Rules

| Limit Type | Value | Applied At |
|-----------|-------|------------|
| Per-contact | 1 msg / 6 sec | Automatic (anti-ban) |
| Per-instance burst | 45 msgs / 6 sec | Automatic (anti-ban) |
| Hourly per contact | 600 msgs | Automatic (anti-ban) |
| Template quality | GREEN/YELLOW/RED | Meta/Facebook |

#### Check Anti-Ban Health

```bash
curl -X GET "https://whatsappapi.fidscript.com/anti-ban/health" \
  -H "apikey: YOUR_API_KEY"
```

**Response:**
```json
{
  "status": "healthy",
  "enabled": true,
  "services": {
    "rateLimiter": "operational",
    "qualityMonitor": "operational",
    "blockTracker": "operational"
  },
  "cache": "redis"
}
```

#### Check Contact Rate Limit

```bash
curl -X GET "https://whatsappapi.fidscript.com/anti-ban/rate-limit/my_business/254712345678" \
  -H "apikey: YOUR_API_KEY"
```

**Response:**
```json
{
  "allowed": true,
  "reason": null,
  "retryAfterMs": 0,
  "currentCount": 2,
  "limit": 10
}
```

#### Check Template Quality

```bash
curl -X GET "https://whatsappapi.fidscript.com/anti-ban/template/hello_world" \
  -H "apikey: YOUR_API_KEY"
```

**Response:**
```json
{
  "templateName": "hello_world",
  "qualityScore": "GREEN",
  "status": "approved",
  "isUsable": true
}
```

---

### 2.8 Analytics

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/analytics/instance/:instanceName` | Instance analytics |
| `GET` | `/analytics/platform` | Platform-wide analytics |
| `GET` | `/analytics/realtime/:instanceName` | Real-time metrics |

#### Instance Analytics

```bash
curl -X GET "https://whatsappapi.fidscript.com/analytics/instance/my_business?startDate=2026-08-01&endDate=2026-08-05" \
  -H "apikey: YOUR_API_KEY"
```

**Response:**
```json
{
  "instanceName": "my_business",
  "status": "open",
  "uptime": 86400,
  "messageStats": {
    "total": 1520,
    "sent": 1500,
    "delivered": 1480,
    "read": 1200,
    "failed": 20,
    "pending": 0
  },
  "deliveryRate": {
    "deliveryRate": 0.987,
    "readRate": 0.8,
    "failedRate": 0.013
  },
  "topContacts": [
    {"phone": "254712345678", "messageCount": 150},
    {"phone": "254723456789", "messageCount": 120}
  ]
}
```

---

### 2.9 Settings

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/settings/set/:instanceName` | Create/update instance settings |
| `GET` | `/settings/find/:instanceName` | Get instance settings |

#### Set Webhook

```bash
curl -X POST "https://whatsappapi.fidscript.com/settings/set/my_business" \
  -H "apikey: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "webhook": {
      "url": "https://your-system.com/webhooks/whatsapp",
      "enabled": true,
      "events": ["message", "message.ack", "connection.update", "qrcode.updated"]
    }
  }'
```

---

### 2.10 Business (Catalog)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/business/getCatalog/:instanceName` | Fetch product catalog |
| `POST` | `/business/getCollections/:instanceName` | Fetch catalog collections |

---

### 2.11 Labels

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/label/findLabels/:instanceName` | Get all labels |
| `POST` | `/label/handleLabel/:instanceName` | Add/remove label from chat |

---

### 2.12 Calls

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/call/offer/:instanceName` | Initiate VoIP call |

---

### 2.13 Integration Layer (Webhooks & Events)

Located in `src/api/integrations/event/event.router.ts` — handles incoming webhooks and event subscriptions for real-time message receiving.

---

## 3. Authentication

### API Key Authentication

All endpoints (except `/`, `/metrics`, `/assets/*`, `/verify-creds`) require:

```
Header: apikey: YOUR_API_KEY
```

### Guards Middleware Chain

For instance-scoped routes, three guards are applied in order:

1. **`instanceExistsGuard`** — Verifies the instance exists
2. **`instanceLoggedGuard`** — Verifies the WhatsApp account is connected
3. **`authGuard['apikey']`** — Validates the API key

### Environment Configuration

The API key is configured via the `AUTHENTICATION_API_KEY` environment variable in the `.env` file.

---

## 4. Public API Exposure via whatsappapi.fidscript.com

### Current Architecture

```
whatsappapi.fidscript.com
         ↓
    Traefik Proxy (fidscript_traefik)
         ↓
    fidscript_whatsapp_api:3099 (internal Docker network)
         ↓
    fidscript_api:8080 (container port)
```

---

## 5. External System Integration Guide

### 5.1 Integration Patterns

#### Pattern 1: Direct API Integration (Recommended)

External systems connect directly to `https://whatsappapi.fidscript.com`:

```bash
# Base URL for all endpoints
BASE_URL="https://whatsappapi.fidscript.com"

# Send a text message
curl -X POST "${BASE_URL}/message/sendText/myInstance" \
  -H "apikey: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "number": "254712345678",
    "text": "Hello from the WhatsApp API!",
    "delay": 1000
  }'
```

#### Pattern 2: Webhook-Based (For Incoming Messages)

Configure a webhook URL to receive incoming messages:

```bash
# Set webhook for instance
curl -X POST "https://whatsappapi.fidscript.com/settings/set/myInstance" \
  -H "apikey: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "webhook": {
      "url": "https://your-system.com/webhooks/whatsapp",
      "enabled": true,
      "events": ["message", "connection.update"]
    }
  }'
```

---

### 5.2 SDK Examples

#### JavaScript/TypeScript SDK

```typescript
const FIDSCRIPT_WA_BASE = 'https://whatsappapi.fidscript.com';
const API_KEY = process.env.WHATSAPP_API_KEY;

class WhatsAppAPI {
  private baseUrl: string;
  private apiKey: string;

  constructor(baseUrl: string, apiKey: string) {
    this.baseUrl = baseUrl;
    this.apiKey = apiKey;
  }

  private async request(endpoint: string, options: RequestInit = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    const headers = {
      'apikey': this.apiKey,
      'Content-Type': 'application/json',
      ...options.headers,
    };

    const response = await fetch(url, { ...options, headers });
    if (!response.ok) {
      throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }
    return response.json();
  }

  // Instance Management
  async createInstance(instanceName: string, integration: string = 'WHATSAPP-BAILEY') {
    return this.request('/instance/create', {
      method: 'POST',
      body: JSON.stringify({ instanceName, integration }),
    });
  }

  async getQRCode(instanceName: string) {
    return this.request(`/instance/connect/${instanceName}`);
  }

  async getConnectionState(instanceName: string) {
    return this.request(`/instance/connectionState/${instanceName}`);
  }

  // Message Sending
  async sendText(instanceName: string, phone: string, text: string, options?: { delay?: number }) {
    return this.request(`/message/sendText/${instanceName}`, {
      method: 'POST',
      body: JSON.stringify({ number: phone, text, ...options }),
    });
  }

  async sendMedia(instanceName: string, phone: string, mediatype: string, media: string, caption?: string) {
    return this.request(`/message/sendMedia/${instanceName}`, {
      method: 'POST',
      body: JSON.stringify({ number: phone, mediatype, media, caption }),
    });
  }

  async sendButtons(instanceName: string, phone: string, title: string, buttons: any[]) {
    return this.request(`/message/sendButtons/${instanceName}`, {
      method: 'POST',
      body: JSON.stringify({ number: phone, title, buttons }),
    });
  }

  async sendList(instanceName: string, phone: string, title: string, buttonText: string, sections: any[]) {
    return this.request(`/message/sendList/${instanceName}`, {
      method: 'POST',
      body: JSON.stringify({ number: phone, title, buttonText, sections }),
    });
  }

  // Campaign Management
  async createCampaign(instanceName: string, name: string, description?: string) {
    return this.request(`/campaign/create/${instanceName}`, {
      method: 'POST',
      body: JSON.stringify({ name, description }),
    });
  }

  async sendCampaign(instanceName: string, name: string, message: any, recipients: any[], maxPerMinute: number = 20) {
    return this.request(`/campaign/send/${instanceName}`, {
      method: 'POST',
      body: JSON.stringify({ name, message, recipients, maxPerMinute }),
    });
  }

  async getCampaignStatus(campaignId: string) {
    return this.request(`/campaign/status/${campaignId}`);
  }

  // Anti-Ban
  async getAntiBanHealth() {
    return this.request('/anti-ban/health');
  }

  async getContactStatus(instanceName: string, phone: string) {
    return this.request(`/anti-ban/contact/${instanceName}/${phone}`);
  }

  // Analytics
  async getInstanceAnalytics(instanceName: string, startDate?: string, endDate?: string) {
    const query = new URLSearchParams();
    if (startDate) query.set('startDate', startDate);
    if (endDate) query.set('endDate', endDate);
    const qs = query.toString();
    return this.request(`/analytics/instance/${instanceName}${qs ? `?${qs}` : ''}`);
  }
}

// Usage
const wa = new WhatsAppAPI(FIDSCRIPT_WA_BASE, API_KEY);

// Create instance and get QR
const instance = await wa.createInstance('my_business');
const qr = await wa.getQRCode('my_business');

// Send messages
await wa.sendText('my_business', '254712345678', 'Hello from WhatsApp API!');

// Send campaign
await wa.sendCampaign('my_business', 'Summer Sale', {
  type: 'text',
  text: 'Check out our summer deals!'
}, [
  { phone: '254712345678', variables: { name: 'John' } },
  { phone: '254723456789', variables: { name: 'Jane' } },
], 20);
```

#### Python SDK Example

```python
import requests
from typing import Optional, Dict, List, Any

class WhatsAppAPI:
    def __init__(self, base_url: str, api_key: str):
        self.base_url = base_url.rstrip('/')
        self.api_key = api_key
        self.headers = {
            "apikey": api_key,
            "Content-Type": "application/json"
        }

    def _request(self, endpoint: str, method: str = "GET", data: Optional[Dict] = None) -> Dict:
        url = f"{self.base_url}{endpoint}"
        response = requests.request(method, url, headers=self.headers, json=data)
        response.raise_for_status()
        return response.json()

    # Instance Management
    def create_instance(self, instance_name: str, integration: str = "WHATSAPP-BAILEY") -> Dict:
        return self._request("/instance/create", "POST", {
            "instanceName": instance_name,
            "integration": integration
        })

    def get_qr_code(self, instance_name: str) -> Dict:
        return self._request(f"/instance/connect/{instance_name}")

    def get_connection_state(self, instance_name: str) -> Dict:
        return self._request(f"/instance/connectionState/{instance_name}")

    # Message Sending
    def send_text(self, instance_name: str, phone: str, text: str, **kwargs) -> Dict:
        payload = {"number": phone, "text": text}
        payload.update(kwargs)
        return self._request(f"/message/sendText/{instance_name}", "POST", payload)

    def send_media(self, instance_name: str, phone: str, mediatype: str, media: str, caption: str = None) -> Dict:
        payload = {"number": phone, "mediatype": mediatype, "media": media}
        if caption:
            payload["caption"] = caption
        return self._request(f"/message/sendMedia/{instance_name}", "POST", payload)

    def send_buttons(self, instance_name: str, phone: str, title: str, buttons: List[Dict]) -> Dict:
        return self._request(f"/message/sendButtons/{instance_name}", "POST", {
            "number": phone,
            "title": title,
            "buttons": buttons
        })

    def send_list(self, instance_name: str, phone: str, title: str, button_text: str, sections: List[Dict]) -> Dict:
        return self._request(f"/message/sendList/{instance_name}", "POST", {
            "number": phone,
            "title": title,
            "buttonText": button_text,
            "sections": sections
        })

    # Campaign Management
    def send_campaign(self, instance_name: str, name: str, message: Dict, recipients: List[Dict], max_per_minute: int = 20) -> Dict:
        return self._request(f"/campaign/send/{instance_name}", "POST", {
            "name": name,
            "message": message,
            "recipients": recipients,
            "maxPerMinute": max_per_minute
        })

    def get_campaign_status(self, campaign_id: str) -> Dict:
        return self._request(f"/campaign/status/{campaign_id}")

    # Anti-Ban
    def get_anti_ban_health(self) -> Dict:
        return self._request("/anti-ban/health")

    def get_contact_status(self, instance_name: str, phone: str) -> Dict:
        return self._request(f"/anti-ban/contact/{instance_name}/{phone}")

    # Analytics
    def get_instance_analytics(self, instance_name: str, start_date: str = None, end_date: str = None) -> Dict:
        params = ""
        if start_date or end_date:
            from urllib.parse import urlencode
            params = "?" + urlencode({"startDate": start_date, "endDate": end_date})
        return self._request(f"/analytics/instance/{instance_name}{params}")


# Usage
wa = WhatsAppAPI("https://whatsappapi.fidscript.com", "YOUR_API_KEY")

# Send message
result = wa.send_text("my_business", "254712345678", "Hello from WhatsApp API!")

# Send campaign
wa.send_campaign("my_business", "Summer Sale", {
    "type": "text",
    "text": "Check out our summer deals!"
}, [
    {"phone": "254712345678", "variables": {"name": "John"}},
    {"phone": "254723456789", "variables": {"name": "Jane"}}
], 20)
```

---

### 5.3 Common Integration Workflows

#### Workflow 1: New Customer Onboarding

```bash
# 1. Create instance
POST /instance/create
{"instanceName": "customer_123"}

# 2. Get QR code (customer scans with WhatsApp)
GET /instance/connect/customer_123

# 3. Wait for connection
GET /instance/connectionState/customer_123
# → { "state": "open" } when connected

# 4. Send welcome message
POST /message/sendText/customer_123
{"number": "254712345678", "text": "Welcome to our service!"}
```

#### Workflow 2: E-commerce Order Notifications

```bash
# Order confirmed
POST /message/sendTemplate/my_business
{"number": "254712345678", "name": "order_confirmed", "language": "en", "components": [...]}

# Shipping update
POST /message/sendTemplate/my_business
{"number": "254712345678", "name": "shipping_update", "language": "en", "components": [...]}

# Delivery confirmation
POST /message/sendTemplate/my_business
{"number": "254712345678", "name": "delivery_confirmed", "language": "en", "components": [...]}
```

#### Workflow 3: Customer Support with Interactive Buttons

```bash
# Initial contact with options
POST /message/sendButtons/support_instance
{
  "number": "254712345678",
  "title": "How can we help?",
  "description": "Select a topic below",
  "buttons": [
    {"type": "reply", "displayText": "Sales Inquiry"},
    {"type": "reply", "displayText": "Technical Support"},
    {"type": "reply", "displayText": "Billing Question"}
  ]
}
```

---

### 5.4 Rate Limits & Best Practices

| Limit Type | Value | Applied At |
|-----------|-------|------------|
| Per-contact | 1 msg / 6 sec | Automatic (anti-ban) |
| Per-instance burst | 45 msgs / 6 sec | Automatic (anti-ban) |
| Hourly per contact | 600 msgs | Automatic (anti-ban) |
| External API | Implement client-side | Your system |

**Recommendations for external systems:**

1. **Implement retry with exponential backoff** (5xx errors)
2. **Cache instance connection state** — don't poll `/connectionState` frequently
3. **Use webhooks for incoming messages** instead of polling
4. **Monitor `/anti-ban/health`** before sending campaigns
5. **Use `delay` parameter** (milliseconds) for time-distributed sending
6. **Set `maxPerMinute`** in campaign to control throughput
7. **Validate phone numbers** before sending (E.164 format recommended)
8. **Handle rate limit responses** — `429 Too Many Requests` with `retryAfterMs`

---

## 6. Traefik Configuration

### Required Traefik Configuration for whatsappapi.fidscript.com

Add to your Traefik dynamic configuration:

```yaml
# /etc/traefik/dynamic.yml (or equivalent)

http:
  # Routers
  routers:
    whatsapp-api:
      rule: "Host(`whatsappapi.fidscript.com`)"
      service: whatsapp-api-service
      tls:
        certResolver: letsencrypt
      middlewares:
        - whatsapp-api-headers
        - whatsapp-api-cors
        - rate-limit

    whatsapp-api-webhook:
      rule: "Host(`whatsappapi.fidscript.com`) && PathPrefix(`/webhook`)"
      service: whatsapp-api-service
      tls:
        certResolver: letsencrypt

  # Services
  services:
    whatsapp-api-service:
      loadBalancer:
        servers:
          - url: "http://fidscript_whatsapp_api:3099"
        healthCheck:
          path: /
          interval: 30s
          timeout: 10s

  # Middleware
  middlewares:
    whatsapp-api-headers:
      headers:
        frameDeny: true
        contentTypeNosniff: true
        browserXssFilter: true
        referrerPolicy: "strict-origin-when-cross-origin"
        customRequestHeaders:
          X-Content-Type-Options: "nosniff"
          X-Frame-Options: "DENY"

    whatsapp-api-cors:
      headers:
        accessControlAllowMethods: "GET,POST,PUT,DELETE,PATCH,OPTIONS"
        accessControlAllowOriginList:
          - "https://whatsappapi.fidscript.com"
          - "https://whatsapp.fidscript.com"
          - "*"
        accessControlAllowHeaders:
          - "apikey"
          - "Content-Type"
          - "Authorization"
          - "X-Requested-With"
        accessControlExposeHeaders:
          - "X-Request-Id"
        accessControlMaxAge: 86400
        addVaryHeader: true

    rate-limit:
      rateLimit:
        average: 100
        burst: 50
        period: 1s

    # IP Whitelist for admin endpoints (optional)
    whatsapp-api-ipwhitelist:
      ipWhiteList:
        sourceRange:
          - "10.0.0.0/8"
          - "172.16.0.0/12"
          - "192.168.0.0/16"
```

---

## 7. Next Steps

### 7.1 DNS Configuration

Add DNS A/AAAA record:
```
whatsappapi.fidscript.com  →  YOUR_VPS_IP
```

### 7.2 SSL/TLS

Already handled by Traefik's Let's Encrypt integration.

### 7.3 Environment Configuration

Ensure in your `.env` file:
```bash
# API Key for authentication
AUTHENTICATION_API_KEY=your_secure_api_key_here

# CORS - set specific domains in production
CORS_ORIGIN=https://whatsapp.fidscript.com,https://your-frontend.com

# Server URL
SERVER_URL=https://whatsappapi.fidscript.com
```

### 7.4 Testing the API

```bash
# Test API is responding
curl https://whatsappapi.fidscript.com/

# Test with API key
curl https://whatsappapi.fidscript.com/ \
  -H "apikey: YOUR_API_KEY"

# Check anti-ban health
curl https://whatsappapi.fidscript.com/anti-ban/health \
  -H "apikey: YOUR_API_KEY"
```

### 7.5 Monitoring

- Prometheus metrics: `GET /metrics` (configure Basic Auth)
- Health checks: `GET /anti-ban/health`
- Instance status: `GET /instance/connectionState/:instanceName`

---

## Appendix: Complete Endpoint Summary

| Category | Count | Key Endpoints |
|----------|-------|---------------|
| System/Info | 4 | `/`, `/metrics`, `/verify-creds`, `/assets/*` |
| Instance | 8 | create, connect, connectState, restart, logout, delete, setPresence, fetchInstances |
| Messages | 17 | sendText, sendMedia, sendAudio, sendSticker, sendLocation, sendContact, sendReaction, sendPoll, sendButtons, sendList, sendInteractiveButtons, sendProduct, sendProductCarousel, sendFlow, sendTemplate, sendStatus, sendPtv |
| Chat | 25 | whatsappNumbers, findContacts, findChats, findMessages, markAsRead, archive, updateBlock, profile management, privacy, presence |
| Group | 17 | create, updateSubject, updateDescription, updatePicture, updateParticipant, updateSetting, findGroupInfos, fetchAllGroups, participants, inviteCode, sendInvite, leaveGroup |
| Campaign | 8 | create, schedule, send, status, list, pause, resume, cancel, delete |
| Anti-Ban | 10 | health, status, rate-limit, template, contact, suppressed, pause-template, resume-template, unsubscribe, resubscribe |
| Analytics | 3 | instance, platform, realtime |
| Settings | 2 | set, find |
| Business | 2 | getCatalog, getCollections |
| Labels | 2 | findLabels, handleLabel |
| Calls | 1 | offer |
| **Total** | **~99 endpoints** | |

---

**Document Generated:** 2026-08-05  
**System:** Next Mavens Fidscript WhatsApp API  
**Documentation:** https://nextmavens.com/docs
