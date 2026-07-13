# WhatsApp Webhook Integration Guide

## Overview

Webhooks allow the Fidscript WhatsApp API to push real-time notifications to your application when events occur. This guide covers webhook configuration, event types, payload structures, and best practices.

## How Webhooks Work

```
WhatsApp Event → WhatsApp API → Webhook POST → Your Server
                       ↓
                 Database (optional)
```

When an event occurs (e.g., incoming message), the WhatsApp API:
1. Processes the event
2. Optionally stores in database
3. Sends HTTP POST to your configured webhook URL
4. Includes event data in JSON payload

## Configuring Webhooks

### Set Webhook

```bash
curl -X POST http://localhost:8080/webhook/set/my-instance \
  -H "apikey: your-api-key" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://your-fidscript-server.com/webhook/whatsapp",
    "webhookByEvents": false,
    "webhookHeaders": {
      "Authorization": "Bearer your-token"
    },
    "events": [
      "MESSAGES_UPSERT",
      "MESSAGES_UPDATE",
      "CONNECTION_UPDATE"
    ]
  }'
```

### Webhook Options

| Option | Type | Description |
|--------|------|-------------|
| `url` | string | Your webhook endpoint URL |
| `webhookByEvents` | boolean | If true, appends event name to URL (e.g., `/webhook/MESSAGES_UPSERT`) |
| `webhookHeaders` | object | Custom headers sent with each request |
| `events` | string[] | Array of event names to receive |
| `base64` | boolean | Encode media as base64 in payload |

### Find Webhook Configuration

```bash
curl http://localhost:8080/webhook/find/my-instance \
  -H "apikey: your-api-key"
```

## Event Types

### Complete Event List

| Event | Description | Direction |
|-------|-------------|-----------|
| `APPLICATION_STARTUP` | Application started | System |
| `QRCODE_UPDATED` | New QR code generated | Outbound |
| `MESSAGES_SET` | Chat history synced | Inbound |
| `MESSAGES_UPSERT` | New message received | Inbound |
| `MESSAGES_EDITED` | Message was edited | Inbound |
| `MESSAGES_UPDATE` | Message status changed | Both |
| `MESSAGES_DELETE` | Message was deleted | Inbound |
| `SEND_MESSAGE` | Outbound message sent | Outbound |
| `SEND_MESSAGE_UPDATE` | Outbound message status | Outbound |
| `CONTACTS_SET` | Contacts list synced | Inbound |
| `CONTACTS_UPSERT` | New/updated contact | Inbound |
| `CONTACTS_UPDATE` | Contact info changed | Inbound |
| `PRESENCE_UPDATE` | User presence changed | Inbound |
| `CHATS_SET` | Chats list synced | Inbound |
| `CHATS_UPSERT` | New/updated chat | Inbound |
| `CHATS_UPDATE` | Chat info changed | Inbound |
| `CHATS_DELETE` | Chat was deleted | Inbound |
| `GROUPS_UPSERT` | New/updated group | Inbound |
| `GROUP_UPDATE` | Group settings changed | Inbound |
| `GROUP_PARTICIPANTS_UPDATE` | Group participant changed | Inbound |
| `CONNECTION_UPDATE` | Connection state changed | Both |
| `LABELS_EDIT` | Label was modified | Inbound |
| `LABELS_ASSOCIATION` | Label applied to chat | Inbound |
| `CALL` | Incoming call received | Inbound |
| `INSTANCE_CREATE` | Instance created | System |
| `INSTANCE_DELETE` | Instance deleted | System |
| `LOGOUT_INSTANCE` | Instance logged out | System |
| `REMOVE_INSTANCE` | Instance removed | System |

## Payload Structures

### MESSAGES_UPSERT (Incoming Message)

```json
{
  "event": "MESSAGES_UPSERT",
  "instance": "my-instance",
  "data": {
    "key": {
      "remoteJid": "5511999999999@s.whatsapp.net",
      "fromMe": false,
      "id": "BAE1234567890ABCD",
      "participant": null
    },
    "pushName": "John Doe",
    "message": {
      "conversation": "Hello! How are you?"
    },
    "messageType": "conversation",
    "messageTimestamp": "1704067200",
    "status": "PENDING",
    "instanceId": "abc-123"
  },
  "date_time": "2024-01-01T12:00:00.000Z"
}
```

### MESSAGES_UPDATE (Message Status Update)

```json
{
  "event": "MESSAGES_UPDATE",
  "instance": "my-instance",
  "data": {
    "key": {
      "remoteJid": "5511999999999@s.whatsapp.net",
      "fromMe": true,
      "id": "BAE1234567890ABCD"
    },
    "update": {
      "status": "READ"
    },
    "messageTimestamp": "1704067200"
  },
  "date_time": "2024-01-01T12:00:05.000Z"
}
```

**Message Status Values:**
- `ERROR` - Message failed
- `PENDING` - Message pending
- `SERVER_ACK` - Server acknowledged
- `DELIVERY_ACK` - Delivered to device
- `READ` - Read by recipient
- `DELETED` - Message deleted
- `PLAYED` - Audio/video played

### CONNECTION_UPDATE

```json
{
  "event": "CONNECTION_UPDATE",
  "instance": "my-instance",
  "data": {
    "instance": "my-instance",
    "state": "open" | "close" | "connecting" | "open_connecting",
    "qrcode": null,
    "message": "Connection established",
    "timestamp": "1704067200"
  },
  "date_time": "2024-01-01T12:00:00.000Z"
}
```

**Connection State Values:**
- `open` - Connected and ready
- `close` - Disconnected
- `connecting` - Establishing connection
- `open_connecting` - Reconnecting

### CONTACTS_UPSERT

```json
{
  "event": "CONTACTS_UPSERT",
  "instance": "my-instance",
  "data": {
    "id": "5511999999999@s.whatsapp.net",
    "name": "John Doe",
    "notify": "John Doe",
    "verifiedName": "John Doe Business",
    "imgUrl": "https://example.com/photo.jpg",
    "status": "available"
  },
  "date_time": "2024-01-01T12:00:00.000Z"
}
```

### GROUP_PARTICIPANTS_UPDATE

```json
{
  "event": "GROUP_PARTICIPANTS_UPDATE",
  "instance": "my-instance",
  "data": {
    "groupJid": "5511999999999-123456@g.us",
    "action": "add" | "remove" | "promote" | "demote",
    "participants": [
      "5511888888888@s.whatsapp.net"
    ]
  },
  "date_time": "2024-01-01T12:00:00.000Z"
}
```

### SEND_MESSAGE (Outbound Message Confirmation)

```json
{
  "event": "SEND_MESSAGE",
  "instance": "my-instance",
  "data": {
    "key": {
      "remoteJid": "5511888888888@s.whatsapp.net",
      "fromMe": true,
      "id": "BAE9876543210DCBA"
    },
    "message": {
      "conversation": "Hello from Fidscript!"
    },
    "messageType": "conversation",
    "status": "PENDING"
  },
  "date_time": "2024-01-01T12:00:00.000Z"
}
```

## Message Types in Payloads

### Text Message

```json
{
  "message": {
    "conversation": "Hello, World!"
  },
  "messageType": "conversation"
}
```

### Extended Text Message

```json
{
  "message": {
    "extendedTextMessage": {
      "text": "Hello with link!",
      "previewType": "external",
      "title": "Example Site",
      "jpegThumbnail": "base64..."
    }
  },
  "messageType": "extendedTextMessage"
}
```

### Image Message

```json
{
  "message": {
    "imageMessage": {
      "url": "https://...",
      "mimetype": "image/jpeg",
      "caption": "Image caption",
      "jpegThumbnail": "base64...",
      "fileLength": "1024000"
    }
  },
  "messageType": "imageMessage"
}
```

### Audio Message

```json
{
  "message": {
    "audioMessage": {
      "url": "https://...",
      "mimetype": "audio/ogg; codecs=opus",
      "fileLength": "1024000",
      "seconds": 30
    }
  },
  "messageType": "audioMessage"
}
```

### Video Message

```json
{
  "message": {
    "videoMessage": {
      "url": "https://...",
      "mimetype": "video/mp4",
      "caption": "Video caption",
      "fileLength": "10240000",
      "seconds": 60
    }
  },
  "messageType": "videoMessage"
}
```

### Document Message

```json
{
  "message": {
    "documentMessage": {
      "url": "https://...",
      "mimetype": "application/pdf",
      "fileName": "document.pdf",
      "fileLength": "1024000",
      "caption": "Document caption"
    }
  },
  "messageType": "documentMessage"
}
```

### Sticker Message

```json
{
  "message": {
    "stickerMessage": {
      "url": "https://...",
      "mimetype": "image/webp",
      "fileLength": "102400",
      "isAnimated": false
    }
  },
  "messageType": "stickerMessage"
}
```

### Location Message

```json
{
  "message": {
    "locationMessage": {
      "degreesLatitude": -23.5505,
      "degreesLongitude": -46.6333,
      "name": "São Paulo",
      "address": "São Paulo, SP, Brazil"
    }
  },
  "messageType": "locationMessage"
}
```

### Contact Message

```json
{
  "message": {
    "contactMessage": {
      "displayName": "John Doe",
      "vcard": "BEGIN:VCARD\nVERSION:3.0\nFN:John Doe\nTEL:+5511999999999\nEND:VCARD"
    }
  },
  "messageType": "contactMessage"
}
```

### Reaction Message

```json
{
  "message": {
    "reactionMessage": {
      "key": {
        "remoteJid": "5511999999999@s.whatsapp.net",
        "fromMe": false,
        "id": "BAE1234567890ABCD"
      },
      "text": "👍"
    }
  },
  "messageType": "reactionMessage"
}
```

### Poll Message

```json
{
  "message": {
    "pollCreationMessage": {
      "name": "Favorite Color",
      "selectableCount": 1,
      "options": [
        { "optionName": "Red" },
        { "optionName": "Blue" },
        { "optionName": "Green" }
      ]
    }
  },
  "messageType": "pollCreationMessage"
}
```

### Buttons Response

```json
{
  "message": {
    "buttonsResponseMessage": {
      "selectedButtonId": "btn1",
      "selectedType": "response"
    }
  },
  "messageType": "buttonsResponseMessage"
}
```

### List Response

```json
{
  "message": {
    "listResponseMessage": {
      "selectedRowId": "row1",
      "selectedType": "list"
    }
  },
  "messageType": "listResponseMessage"
}
```

## Implementing Your Webhook Server

### Example: Node.js Express

```javascript
const express = require('express');
const crypto = require('crypto');

const app = express();
app.use(express.json());

// Optional: Verify webhook signature
const WEBHOOK_SECRET = 'your-webhook-secret';

function verifySignature(req, res, next) {
  const signature = req.headers['x-webhook-signature'];
  if (!signature) return next();

  const hmac = crypto
    .createHmac('sha256', WEBHOOK_SECRET)
    .update(JSON.stringify(req.body))
    .digest('hex');

  if (signature !== hmac) {
    return res.status(401).json({ error: 'Invalid signature' });
  }
  next();
}

app.post('/webhook/whatsapp', verifySignature, (req, res) => {
  const { event, instance, data, date_time } = req.body;

  console.log(`Received ${event} from ${instance}`);

  switch (event) {
    case 'MESSAGES_UPSERT':
      handleIncomingMessage(data);
      break;
    case 'MESSAGES_UPDATE':
      handleMessageUpdate(data);
      break;
    case 'CONNECTION_UPDATE':
      handleConnectionUpdate(data);
      break;
    default:
      console.log('Unhandled event:', event);
  }

  // Respond quickly to avoid timeout
  res.status(200).json({ received: true });
});

function handleIncomingMessage(data) {
  const { key, pushName, message, messageType } = data;
  const from = key.remoteJid;
  const text = message?.conversation || message?.extendedTextMessage?.text;

  console.log(`${pushName} (${from}): ${text}`);

  // TODO: Store in your database, reply via Fidscript API, etc.
}

function handleMessageUpdate(data) {
  const { key, update } = data;
  console.log(`Message ${key.id} status: ${update.status}`);
}

function handleConnectionUpdate(data) {
  console.log(`Connection state: ${data.state}`);
}

app.listen(3000, () => {
  console.log('Webhook server running on port 3000');
});
```

### Example: Python Flask

```python
from flask import Flask, request, jsonify
import hmac
import hashlib

app = Flask(__name__)
WEBHOOK_SECRET = 'your-webhook-secret'

@app.route('/webhook/whatsapp', methods=['POST'])
def webhook():
    data = request.json
    event = data.get('event')
    instance = data.get('instance')

    print(f"Received {event} from {instance}")

    if event == 'MESSAGES_UPSERT':
        handle_message(data['data'])
    elif event == 'CONNECTION_UPDATE':
        handle_connection(data['data'])

    return jsonify({'received': True})

def handle_message(data):
    key = data['key']
    message = data.get('message', {})
    text = message.get('conversation') or message.get('extendedTextMessage', {}).get('text')

    print(f"Message from {key['remoteJid']}: {text}")

    # TODO: Process message

def handle_connection(data):
    print(f"Connection: {data['state']}")

if __name__ == '__main__':
    app.run(port=3000)
```

### Example: Next.js API Route

```typescript
// app/api/webhook/whatsapp/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const data = await req.json();
  const { event, instance, data: eventData } = data;

  console.log(`Received ${event} from ${instance}`);

  switch (event) {
    case 'MESSAGES_UPSERT':
      await handleIncomingMessage(eventData);
      break;
    case 'CONNECTION_UPDATE':
      await handleConnectionUpdate(eventData);
      break;
  }

  return NextResponse.json({ received: true });
}

async function handleIncomingMessage(data: any) {
  const { key, pushName, message } = data;
  const text = message?.conversation || message?.extendedTextMessage?.text;

  // TODO: Process message in your application
  console.log(`${pushName}: ${text}`);
}

async function handleConnectionUpdate(data: any) {
  console.log(`Connection state: ${data.state}`);
}
```

## Handling Media Files

### Download Media from Message

```javascript
// When receiving an image/video message
const message = data.message;

// Get media URL
const mediaUrl = message.imageMessage?.url ||
                 message.videoMessage?.url ||
                 message.audioMessage?.url;

// Download and process
const response = await fetch(mediaUrl, {
  headers: {
    'Authorization': `Bearer ${apiKey}`
  }
});
const buffer = await response.buffer();
```

### With Base64 Encoding

Enable base64 encoding in webhook config:

```bash
curl -X POST http://localhost:8080/webhook/set/my-instance \
  -H "apikey: your-api-key" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://your-server.com/webhook",
    "base64": true,
    "events": ["MESSAGES_UPSERT"]
  }'
```

Now media is included directly in payload:

```json
{
  "event": "MESSAGES_UPSERT",
  "data": {
    "message": {
      "imageMessage": {
        "url": "",
        "mimetype": "image/jpeg",
        "caption": "Image",
        "jpegThumbnail": "base64-encoded-thumbnail",
        "mediaKey": "...",
        "fileEncSha256": "...",
        "directPath": "/obj..."
      }
    }
  }
}
```

## Best Practices

### 1. Respond Quickly

Always respond with 200 status within 5 seconds. Process heavy work asynchronously:

```javascript
app.post('/webhook/whatsapp', async (req, res) => {
  // Acknowledge immediately
  res.status(200).json({ received: true });

  // Process in background
  await processMessage(req.body);
});

async function processMessage(data) {
  // Heavy processing, database operations, etc.
}
```

### 2. Implement Idempotency

The same event might be delivered multiple times. Use message ID for deduplication:

```javascript
const processedMessages = new Set();

function handleMessage(data) {
  const messageId = data.key.id;

  if (processedMessages.has(messageId)) {
    console.log('Duplicate message, skipping');
    return;
  }

  processedMessages.add(messageId);
  // Process message...
}
```

### 3. Verify Webhook Setup

After configuring, verify webhook is working:

```bash
curl -X POST http://localhost:8080/webhook/set/my-instance \
  -H "apikey: your-api-key" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://your-server.com/webhook/test",
    "events": ["MESSAGES_UPSERT"]
  }'
```

Send a test message to verify delivery.

### 4. Handle Connection Updates

Always monitor `CONNECTION_UPDATE` events:

```javascript
app.post('/webhook/whatsapp', (req, res) => {
  const { event, data } = req.body;

  if (event === 'CONNECTION_UPDATE') {
    if (data.state === 'close') {
      console.log('WhatsApp disconnected!');
      // Alert admin, attempt reconnect, etc.
    } else if (data.state === 'open') {
      console.log('WhatsApp connected!');
    }
  }

  res.status(200).json({ received: true });
});
```

### 5. Secure Your Webhook

Use authentication headers and verify them:

```javascript
app.post('/webhook/whatsapp', (req, res) => {
  const authHeader = req.headers.authorization;

  if (authHeader !== 'Bearer your-secret-token') {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // Process webhook
  res.status(200).json({ received: true });
});
```

## Testing Webhooks

### Using ngrok for Local Development

```bash
# Install ngrok
# Then run
ngrok http 3000

# Copy the https URL and configure webhook
# https://abc123.ngrok.io/webhook/whatsapp
```

### Manual Test with curl

```bash
curl -X POST https://your-server.com/webhook/whatsapp \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-token" \
  -d '{
    "event": "MESSAGES_UPSERT",
    "instance": "test-instance",
    "data": {
      "key": {
        "remoteJid": "5511999999999@s.whatsapp.net",
        "fromMe": false,
        "id": "TEST123"
      },
      "pushName": "Test User",
      "message": {
        "conversation": "Test message"
      },
      "messageType": "conversation",
      "messageTimestamp": "1704067200",
      "status": "PENDING"
    },
    "date_time": "2024-01-01T12:00:00.000Z"
  }'
```

## Troubleshooting

### Webhook Not Receiving Events

1. Check URL is publicly accessible
2. Verify firewall allows incoming HTTP/HTTPS
3. Check logs on your server
4. Verify webhook is configured: `GET /webhook/find/{instanceName}`
5. Test with ngrok if behind NAT

### Duplicate Events

- This is normal for WhatsApp protocol
- Implement idempotency using message ID

### Missing Events

1. Verify event is in your `events` array
2. Check if webhook URL returns 200 quickly enough
3. Webhook has retry logic (10 attempts with exponential backoff)

### Connection Drops

- Monitor `CONNECTION_UPDATE` events
- Implement auto-reconnect logic
- Check WhatsApp session validity

## Webhook Retry Logic

The WhatsApp API retries failed webhook deliveries:

- Max retries: 10
- Backoff: Exponential (1s, 2s, 4s, 8s...)
- Max backoff: 5 minutes

If all retries fail, the event is logged but discarded.

## Next Steps

- Review the [API Reference](./WHATSAPP_API_REFERENCE.md) for sending messages
- See the [Integration Guide](./WHATSAPP_INTEGRATION.md) for complete setup
- Check the [Deployment Guide](./WHATSAPP_DEPLOYMENT.md) for production setup
