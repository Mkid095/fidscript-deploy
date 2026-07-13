# WhatsApp Service API Reference

## Base URL

```
Production: https://whatsapp-api.your-domain.com
Development: http://localhost:8080
```

## Authentication

All endpoints require authentication using the `apikey` header or query parameter.

### Header Authentication
```bash
curl -H "apikey: your-api-key" https://whatsapp-api.example.com/instance/find
```

### Query Parameter Authentication
```bash
curl https://whatsapp-api.example.com/instance/find?apikey=your-api-key
```

---

## Instance Endpoints

### Create Instance

Creates a new WhatsApp instance.

**Endpoint:** `POST /instance/create`

**Headers:**
- `Content-Type: application/json`
- `apikey: string` (required)

**Request Body:**
```json
{
  "instanceName": "string",           // Unique instance name
  "integration": "WHATSAPP-BAILEY" | "WHATSAPP-BUSINESS",
  "qrcode": true,                     // Return QR code for Baileys
  "webhook": {
    "url": "string",
    "webhookByEvents": boolean,
    "webhookHeaders": {},
    "base64": boolean
  },
  "websocket": {
    "enabled": boolean
  },
  "rabbitmq": {
    "enabled": boolean,
    "events": []
  },
  "nats": {
    "enabled": boolean,
    "events": []
  },
  "sqs": {
    "enabled": boolean,
    "events": []
  }
}
```

**Response (201):**
```json
{
  "instance": {
    "instanceName": "my-instance",
    "instanceId": "abc123",
    "integration": "WHATSAPP-BAILEY",
    "status": "open"
  },
  "hash": {
    "watermark": "...",
    "certificate": "..."
  },
  "qrcode": {
    "code": "...",
    "base64": "data:image/png;base64,..."
  }
}
```

---

### Connect Instance (Get QR Code)

Fetches QR code for Baileys instances.

**Endpoint:** `GET /instance/connect/{instanceName}`

**Response (200):**
```json
{
  "qrcode": {
    "code": "2@XYZ...",
    "base64": "data:image/png;base64,..."
  }
}
```

---

### Find Instance

Retrieves instance information.

**Endpoint:** `GET /instance/find`

**Query Parameters:**
- `instanceName`: string (optional)

**Response (200):**
```json
{
  "instance": {
    "instanceName": "my-instance",
    "instanceId": "abc123",
    "owner": "user123",
    "integration": "WHATSAPP-BAILEY",
    "status": "open",
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
}
```

---

### Delete Instance

Deletes an instance and all associated data.

**Endpoint:** `DELETE /instance/delete/{instanceName}`

**Response (200):**
```json
{
  "instance": {
    "instanceName": "my-instance",
    "status": "deleted"
  }
}
```

---

## Message Endpoints

### Send Text Message

**Endpoint:** `POST /message/sendText/{instanceName}`

**Request Body:**
```json
{
  "number": "5511888888888",          // Phone number with country code
  "text": "Hello, World!",            // Message text
  "quoted": {},                        // Optional quote/reply
  "mentioned": [],                     // Optional mentioned jids
  "everyOne": false,                   // Mention everyone in group
  "linkPreview": true                  // Generate link preview
}
```

**Response (201):**
```json
{
  "key": {
    "remoteJid": "5511888888888@s.whatsapp.net",
    "fromMe": true,
    "id": "BAE1234567890ABCD"
  },
  "message": {
    "conversation": "Hello, World!"
  },
  "messageType": "conversation",
  "status": "PENDING"
}
```

---

### Send Media Message

**Endpoint:** `POST /message/sendMedia/{instanceName}`

**Request Body:**
```json
{
  "number": "5511888888888",
  "mediatype": "image" | "video" | "audio" | "document" | "ptv",
  "media": "https://example.com/file.jpg",  // URL or base64
  "caption": "Image caption",
  "fileName": "optional-filename.jpg",
  "mimetype": "image/jpeg",
  "quoted": {},
  "mentioned": [],
  "everyOne": false
}
```

**Response (201):**
```json
{
  "key": {
    "remoteJid": "5511888888888@s.whatsapp.net",
    "fromMe": true,
    "id": "BAE9876543210DCBA"
  },
  "message": {
    "imageMessage": {
      "url": "https://...",
      "mimetype": "image/jpeg",
      "caption": "Image caption"
    }
  },
  "messageType": "imageMessage",
  "status": "PENDING"
}
```

---

### Send Audio Message

**Endpoint:** `POST /message/sendWhatsAppAudio/{instanceName}`

**Request Body:**
```json
{
  "number": "5511888888888",
  "audio": "https://example.com/audio.mp3"  // URL or base64
}
```

---

### Send Sticker

**Endpoint:** `POST /message/sendSticker/{instanceName}`

**Request Body:**
```json
{
  "number": "5511888888888",
  "sticker": "https://example.com/sticker.webp"  // URL or base64 (webp)
}
```

---

### Send Location

**Endpoint:** `POST /message/sendLocation/{instanceName}`

**Request Body:**
```json
{
  "number": "5511888888888",
  "latitude": -23.5505,
  "longitude": -46.6333,
  "name": "São Paulo",
  "address": "São Paulo, SP, Brazil"
}
```

---

### Send Contact

**Endpoint:** `POST /message/sendContact/{instanceName}`

**Request Body:**
```json
{
  "number": "5511888888888",
  "contact": [
    {
      "fullName": "John Doe",
      "wuid": "5511999999999@s.whatsapp.net",
      "phoneNumber": "5511999999999",
      "organization": "Acme Inc",
      "email": "john@example.com",
      "url": "https://example.com"
    }
  ]
}
```

---

### Send Reaction

**Endpoint:** `POST /message/sendReaction/{instanceName}`

**Request Body:**
```json
{
  "key": {
    "remoteJid": "5511888888888@s.whatsapp.net",
    "id": "BAE1234567890ABCD",
    "fromMe": false
  },
  "reaction": "👍"
}
```

---

### Send Poll

**Endpoint:** `POST /message/sendPoll/{instanceName}`

**Request Body:**
```json
{
  "number": "5511888888888",
  "poll": {
    "name": "Favorite Color",
    "selectableCount": 1,
    "values": ["Red", "Blue", "Green"],
    "messageSecret": "optional-secret"
  }
}
```

---

### Send Buttons

**Endpoint:** `POST /message/sendButtons/{instanceName}`

**Request Body:**
```json
{
  "number": "5511888888888",
  "title": "Choose an option",
  "description": "Select one of the following",
  "footerText": "Powered by Fidscript",
  "buttons": [
    {
      "type": "reply",
      "id": "btn1",
      "title": "Option 1"
    },
    {
      "type": "url",
      "title": "Visit Website",
      "url": "https://example.com"
    },
    {
      "type": "call",
      "title": "Call Us",
      "phoneNumber": "+1234567890"
    }
  ]
}
```

---

### Send List Message

**Endpoint:** `POST /message/sendList/{instanceName}`

**Request Body:**
```json
{
  "number": "5511888888888",
  "title": "Menu",
  "description": "Select an item",
  "buttonText": "View Menu",
  "sections": [
    {
      "title": "Food",
      "rows": [
        { "title": "Pizza", "description": "$15", "rowId": "pizza" },
        { "title": "Burger", "description": "$10", "rowId": "burger" }
      ]
    },
    {
      "title": "Drinks",
      "rows": [
        { "title": "Coke", "description": "$3", "rowId": "coke" },
        { "title": "Water", "description": "$2", "rowId": "water" }
      ]
    }
  ]
}
```

---

### Send Interactive Buttons (WhatsApp Business)

**Endpoint:** `POST /message/sendInteractiveButtons/{instanceName}`

**Request Body:**
```json
{
  "number": "5511888888888",
  "header": {
    "type": "text",
    "text": "Header Text"
  },
  "body": {
    "text": "Body text content"
  },
  "footer": {
    "text": "Footer text"
  },
  "action": {
    "buttons": [
      {
        "type": "reply",
        "reply": {
          "id": "btn1",
          "title": "Yes"
        }
      },
      {
        "type": "reply",
        "reply": {
          "id": "btn2",
          "title": "No"
        }
      }
    ]
  }
}
```

---

### Send Product Message

**Endpoint:** `POST /message/sendProduct/{instanceName}`

**Request Body:**
```json
{
  "number": "5511888888888",
  "product": {
    "catalogId": "CATALOG123",
    "productId": "PROD456",
    "storefrontName": "My Store"
  },
  "sections": [
    {
      "title": "Products",
      "productItems": [
        {
          "productId": "PROD456"
        }
      ]
    }
  ]
}
```

---

### Send Product Carousel

**Endpoint:** `POST /message/sendProductCarousel/{instanceName}`

---

### Send Flow Message

**Endpoint:** `POST /message/sendFlow/{instanceName}`

**Request Body:**
```json
{
  "number": "5511888888888",
  "flowId": "FLOW123",
  "flowToken": "token123",
  "screen": "initial_screen",
  "action": "navigate",
  "data": {}
}
```

---

### Send Status

**Endpoint:** `POST /message/sendStatus/{instanceName}`

**Request Body:**
```json
{
  "status": {
    "type": "image" | "video" | "text",
    "content": "https://example.com/media",
    "caption": "My status",
    "backgroundColor": "#FFFFFF",
    "font": 1,
    "statusJidList": ["5511888888888@g.us"],
    "allContacts": false
  }
}
```

---

## Chat Endpoints

### WhatsApp Number Check

Verify if numbers are on WhatsApp.

**Endpoint:** `POST /chat/whatsappNumber/{instanceName}`

**Request Body:**
```json
{
  "numbers": ["5511888888888", "5511999999999"]
}
```

**Response (200):**
```json
{
  "exists": [
    {
      "wuid": "5511888888888@s.whatsapp.net",
      "exists": true
    },
    {
      "wuid": "5511999999999@s.whatsapp.net",
      "exists": false
    }
  ]
}
```

---

### Mark as Read

**Endpoint:** `PUT /chat/markRead/{instanceName}`

**Request Body:**
```json
{
  "lastMessage": {
    "remoteJid": "5511888888888@s.whatsapp.net",
    "fromMe": false,
    "id": "BAE1234567890ABCD"
  }
}
```

---

### Send Presence

**Endpoint:** `PUT /chat/sendPresence/{instanceName}`

**Request Body:**
```json
{
  "number": "5511888888888",
  "presence": "available" | "composing" | "recording" | "paused"
}
```

---

## Group Endpoints

### Create Group

**Endpoint:** `POST /group/create/{instanceName}`

**Request Body:**
```json
{
  "subject": "Group Name",
  "participants": ["5511888888888", "5511999999999"],
  "messageSecret": false
}
```

---

### Update Group Subject

**Endpoint:** `PUT /group/updateSubject/{instanceName}`

**Request Body:**
```json
{
  "groupJid": "5511999999999-123456@g.us",
  "subject": "New Group Name"
}
```

---

### Add Participants

**Endpoint:** `PUT /group/addParticipants/{instanceName}`

**Request Body:**
```json
{
  "groupJid": "5511999999999-123456@g.us",
  "participants": ["5511777777777"]
}
```

---

### Remove Participants

**Endpoint:** `PUT /group/removeParticipants/{instanceName}`

---

### Get Group Invite Link

**Endpoint:** `GET /group/getInviteLink/{instanceName}`

---

## Webhook Endpoints

### Set Webhook

**Endpoint:** `POST /webhook/set/{instanceName}`

**Request Body:**
```json
{
  "url": "https://your-server.com/webhook",
  "webhookByEvents": true,
  "webhookHeaders": {
    "Authorization": "Bearer token"
  },
  "events": [
    "MESSAGES_UPSERT",
    "MESSAGES_UPDATE",
    "CONNECTION_UPDATE"
  ],
  "base64": false
}
```

---

### Find Webhook

**Endpoint:** `GET /webhook/find/{instanceName}`

---

## Anti-Ban Endpoints

### Get Anti-Ban Status

**Endpoint:** `GET /anti-ban/status/{instanceName}`

**Response (200):**
```json
{
  "instanceName": "my-instance",
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

---

### Check Can Send

**Endpoint:** `POST /anti-ban/canSend/{instanceName}`

**Request Body:**
```json
{
  "number": "5511888888888"
}
```

**Response (200):**
```json
{
  "canSend": true,
  "reason": null
}
```

---

## Campaign Endpoints

### Create Campaign

**Endpoint:** `POST /campaign/create`

**Request Body:**
```json
{
  "name": "Marketing Campaign",
  "instanceName": "my-instance",
  "scheduledAt": "2024-01-15T10:00:00.000Z"
}
```

---

### Add Recipients

**Endpoint:** `POST /campaign/addRecipients`

---

### Send Campaign

**Endpoint:** `POST /campaign/send`

**Request Body:**
```json
{
  "campaignId": "campaign-123",
  "message": {
    "text": "Hello! Check our new products."
  }
}
```

---

### Get Campaign Status

**Endpoint:** `GET /campaign/find/{campaignId}`

---

## Analytics Endpoints

### Get Instance Analytics

**Endpoint:** `GET /analytics/instance/{instanceName}`

---

### Get Message Analytics

**Endpoint:** `POST /analytics/messages`

**Request Body:**
```json
{
  "instanceName": "my-instance",
  "startDate": "2024-01-01",
  "endDate": "2024-01-31"
}
```

---

## Chatwoot Endpoints

### Set Chatwoot

**Endpoint:** `POST /chatwoot/set/{instanceName}`

**Request Body:**
```json
{
  "accountId": "123",
  "token": "chatwoot-token",
  "url": "https://chat.example.com",
  "signMsg": true,
  "nameInbox": "WhatsApp Support",
  "number": "551155555555",
  "reopenConversation": false,
  "conversationPending": false,
  "importContacts": true,
  "mergeBrazilContacts": false,
  "importMessages": true,
  "daysLimitImportMessages": 60,
  "autoCreate": true
}
```

---

## Health Endpoint

### Health Check

**Endpoint:** `GET /health`

**Response (200):**
```json
{
  "status": "OK",
  "timestamp": "2024-01-01T12:00:00.000Z",
  "uptime": 86400,
  "database": "connected",
  "redis": "connected"
}
```

---

## Error Responses

### Error Format

```json
{
  "status": 400,
  "message": "Human-readable error message",
  "error": "Error type"
}
```

### Status Codes

| Code | Error | Description |
|------|-------|-------------|
| 400 | Bad Request | Invalid request parameters |
| 401 | Unauthorized | Invalid or missing API key |
| 403 | Forbidden | Access denied |
| 404 | Not Found | Resource not found |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | Server error |

---

## Rate Limits

| Endpoint Type | Limit |
|---------------|-------|
| Message Sending | 1 per 6 seconds (configurable) |
| Instance Creation | 10 per minute |
| Webhook Configuration | 10 per minute |
| Instance Query | 100 per minute |
