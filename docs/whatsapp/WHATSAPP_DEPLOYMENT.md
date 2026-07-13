# WhatsApp Service Deployment Guide

## Overview

This guide covers deploying the Next Mavens Fidscript WhatsApp API service in production environments.

## Prerequisites

### System Requirements

| Component | Minimum | Recommended |
|-----------|---------|-------------|
| CPU | 2 cores | 4+ cores |
| RAM | 4 GB | 8+ GB |
| Storage | 20 GB SSD | 50+ GB SSD |
| OS | Ubuntu 20.04 / Debian 11 | Ubuntu 22.04 LTS |

### Required Services

- **PostgreSQL** 14+ or **MySQL** 8+
- **Redis** 6+ (required for anti-ban system)
- **Node.js** 20 LTS (if running directly)

### Optional Services

- **S3-compatible storage** (MinIO, AWS S3) for media storage
- **RabbitMQ/NATS/SQS** for event queue processing

## Deployment Options

### Option 1: Docker Deployment (Recommended)

#### 1.1 Create docker-compose.yml

```yaml
version: '3.8'

services:
  whatsapp-api:
    build:
      context: ./apps/whatsapp-api
      dockerfile: Dockerfile
    container_name: fidscript-whatsapp-api
    restart: unless-stopped
    ports:
      - "8080:8080"
    environment:
      - NODE_ENV=production
    env_file:
      - ./apps/whatsapp-api/.env
    volumes:
      - whatsapp-sessions:/app/.sessions
      - whatsapp-media:/app/media
    depends_on:
      - postgres
      - redis

  postgres:
    image: postgres:16-alpine
    container_name: fidscript-whatsapp-postgres
    restart: unless-stopped
    environment:
      POSTGRES_DB: fidscript_whatsapp
      POSTGRES_USER: fidscript
      POSTGRES_PASSWORD: your-secure-password
    volumes:
      - postgres-data:/var/lib/postgresql/data
    ports:
      - "5432:5432"

  redis:
    image: redis:7-alpine
    container_name: fidscript-whatsapp-redis
    restart: unless-stopped
    volumes:
      - redis-data:/data
    ports:
      - "6379:6379"

volumes:
  whatsapp-sessions:
  whatsapp-media:
  postgres-data:
  redis-data:
```

#### 1.2 Environment Configuration

Create `apps/whatsapp-api/.env`:

```env
# Server
PROTOCOL=https
PORT=8080
HOST=0.0.0.0
SSL_CERT=/path/to/ssl/cert.pem
SSL_KEY=/path/to/ssl/key.pem

# Database
DATABASE_PROVIDER=postgresql
DATABASE_URL=postgresql://fidscript:your-secure-password@postgres:5432/fidscript_whatsapp

# Redis
REDIS_URI=redis://redis:6379

# Authentication
AUTHENTICATION_API_KEY=true
API_KEY_NAME=apikey
API_KEY_SECRET=your-very-secure-api-key-here

# WhatsApp
WHATSAPP_SESSION_PATH=/app/.sessions
WHATSAPP_SESSION_TTL=604800

# Anti-Ban (Critical for Production)
ANTI_BAN_ENABLED=true
RATE_LIMIT_CONTACT_MS=6000
RATE_LIMIT_CONTACT_HOURLY=500
RATE_LIMIT_BURST=30
BLOCK_THRESHOLD=5
SUPPRESSION_TTL_DAYS=30
QUALITY_ALERT_THRESHOLD=YELLOW
AUTO_PAUSE_ON_RED_DAYS=2

# Chatwoot
CHATWOOT_ENABLED=false

# Webhook
WEBHOOK_GLOBAL_URL=https://your-domain.com/webhook

# Logging
LOG_LEVEL=info
LOG_COLORIZE=false
```

#### 1.3 Build and Start

```bash
# Build images
docker-compose build

# Start services
docker-compose up -d

# View logs
docker-compose logs -f whatsapp-api
```

### Option 2: Traditional Deployment

#### 2.1 Install Dependencies

```bash
cd apps/whatsapp-api
npm install
```

#### 2.2 Build for Production

```bash
npm run build
```

#### 2.3 Configure Systemd Service

Create `/etc/systemd/system/fidscript-whatsapp.service`:

```ini
[Unit]
Description=Next Mavens Fidscript WhatsApp API
After=network.target postgresql.service redis.service

[Service]
Type=simple
User=fidscript
WorkingDirectory=/opt/fidscript/apps/whatsapp-api
ExecStart=/opt/fidscript/apps/whatsapp-api/node_modules/.bin/tsx ./src/main.ts
Restart=always
RestartSec=10
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```

#### 2.4 Install and Start

```bash
# Copy files
sudo cp -r apps/whatsapp-api /opt/fidscript/

# Reload systemd
sudo systemctl daemon-reload

# Enable and start service
sudo systemctl enable fidscript-whatsapp
sudo systemctl start fidscript-whatsapp

# Check status
sudo systemctl status fidscript-whatsapp
```

## Database Setup

### PostgreSQL Setup

```bash
# Connect to PostgreSQL
psql -U postgres

# Create database and user
CREATE DATABASE fidscript_whatsapp;
CREATE USER fidscript WITH ENCRYPTED PASSWORD 'your-secure-password';
GRANT ALL PRIVILEGES ON DATABASE fidscript_whatsapp TO fidscript;
\c fidscript_whatsapp
GRANT ALL ON SCHEMA public TO fidscript;
```

### Run Migrations

```bash
# Set environment
export DATABASE_PROVIDER=postgresql
export DATABASE_URL=postgresql://fidscript:your-secure-password@localhost:5432/fidscript_whatsapp

# Generate Prisma client
npm run db:generate

# Run migrations
npm run db:migrate:dev
```

## Redis Setup

### Basic Redis Setup

```bash
# Install Redis
sudo apt-get install redis-server

# Configure Redis
sudo nano /etc/redis/redis.conf
# Set: maxmemory 256mb
# Set: maxmemory-policy allkeys-lru

# Restart Redis
sudo systemctl restart redis-server
```

## Reverse Proxy Configuration

### Nginx Configuration

Create `/etc/nginx/sites-available/fidscript-whatsapp`:

```nginx
upstream whatsapp_api {
    server 127.0.0.1:8080;
    keepalive 64;
}

server {
    listen 443 ssl http2;
    server_name whatsapp-api.your-domain.com;

    ssl_certificate /path/to/fullchain.pem;
    ssl_certificate_key /path/to/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256;
    ssl_prefer_server_ciphers off;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    location / {
        proxy_pass http://whatsapp_api;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;

        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 300s;
        proxy_read_timeout 300s;
    }

    # Large file upload for media
    client_max_body_size 100M;
}

server {
    listen 80;
    server_name whatsapp-api.your-domain.com;
    return 301 https://$server_name$request_uri;
}
```

Enable the site:
```bash
sudo ln -s /etc/nginx/sites-available/fidscript-whatsapp /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

## SSL Configuration

### Using Let's Encrypt

```bash
# Install Certbot
sudo apt-get install certbot python3-certbot-nginx

# Obtain certificate
sudo certbot --nginx -d whatsapp-api.your-domain.com
```

## Production Checklist

### Security Checklist

- [ ] Change default API key secret
- [ ] Enable SSL/TLS
- [ ] Configure firewall (allow only 80, 443, 22)
- [ ] Set up database password
- [ ] Enable Redis authentication
- [ ] Configure CORS for allowed domains
- [ ] Set up log rotation
- [ ] Enable rate limiting at nginx level

### Performance Checklist

- [ ] Enable Redis caching
- [ ] Configure PostgreSQL connection pooling
- [ ] Set up CDN for media files
- [ ] Enable gzip compression
- [ ] Configure proper indexes in database
- [ ] Set up monitoring and alerts

### Monitoring Checklist

- [ ] Set up health check endpoint monitoring
- [ ] Configure log aggregation
- [ ] Set up error tracking (Sentry)
- [ ] Configure disk space monitoring
- [ ] Set up memory usage alerts
- [ ] Configure database connection monitoring

## Health Checks

### Configure Health Check

Add to nginx:
```nginx
location /health {
    proxy_pass http://whatsapp_api;
    access_log off;
}
```

### Health Check Response

```bash
curl https://whatsapp-api.your-domain.com/health
```

Expected response:
```json
{
  "status": "OK",
  "timestamp": "2024-01-01T12:00:00.000Z",
  "uptime": 86400
}
```

## Backup Strategy

### Database Backup Script

Create `/opt/fidscript/backup-whatsapp.sh`:

```bash
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR=/opt/fidscript/backups/whatsapp
mkdir -p $BACKUP_DIR

# Database backup
pg_dump -U fidscript -h localhost fidscript_whatsapp | gzip > $BACKUP_DIR/db_$DATE.sql.gz

# Session backup (keep last 7 days)
tar -czf $BACKUP_DIR/sessions_$DATE.tar.gz /opt/fidscript/apps/whatsapp-api/.sessions

# Remove backups older than 30 days
find $BACKUP_DIR -type f -mtime +30 -delete

echo "Backup completed: $DATE"
```

Add to crontab:
```bash
crontab -e
# Add: 0 2 * * * /opt/fidscript/backup-whatsapp.sh
```

## Scaling

### Horizontal Scaling

For multiple instances:

1. Use Redis for session storage (instead of local filesystem)
2. Configure sticky sessions or session affinity at load balancer
3. Share session path via NFS or similar

```env
# In .env for each instance
WHATSAPP_SESSION_PATH=/shared-sessions
REDIS_URI=redis://shared-redis:6379
```

### Load Balancer Configuration

```
                    ┌─────────────────┐
                    │  Load Balancer  │
                    │   (Nginx/HAProxy)│
                    └────────┬────────┘
                             │
         ┌───────────────────┼───────────────────┐
         │                   │                   │
    ┌────▼────┐         ┌────▼────┐         ┌────▼────┐
    │ Instance│         │ Instance│         │ Instance│
    │    1    │         │    2    │         │    3    │
    └────┬────┘         └────┬────┘         └────┬────┘
         │                   │                   │
         └───────────────────┼───────────────────┘
                             │
                    ┌────────▼────────┐
                    │   PostgreSQL     │
                    │   (Shared DB)   │
                    └─────────────────┘
                             │
                    ┌────────▼────────┐
                    │     Redis        │
                    │   (Shared Cache) │
                    └─────────────────┘
```

## Troubleshooting

### Common Issues

#### Database Connection Failed

```
Error: P1001 - Can't reach database
```

Solution:
1. Check PostgreSQL is running
2. Verify DATABASE_URL in .env
3. Check firewall rules

#### Redis Connection Failed

```
Error: Redis connection refused
```

Solution:
1. Check Redis is running: `redis-cli ping`
2. Verify REDIS_URI in .env
3. Check Redis password if configured

#### WhatsApp Session Lost

If instances disconnect frequently:
1. Use persistent storage for sessions (volumes)
2. Increase session TTL
3. Check device stability

#### Media Upload Fails

1. Check S3/MinIO configuration
2. Verify disk space
3. Check write permissions

### View Logs

```bash
# Docker
docker-compose logs -f whatsapp-api

# Systemd
journalctl -u fidscript-whatsapp -f

# Direct
tail -f /opt/fidscript/apps/whatsapp-api/logs/app.log
```

## Maintenance

### Update Procedure

```bash
# 1. Pull latest code
cd /opt/fidscript
git pull origin main

# 2. Build
cd apps/whatsapp-api
npm run build

# 3. Restart service
sudo systemctl restart fidscript-whatsapp

# Or with Docker
docker-compose pull
docker-compose up -d
```

### Restart Procedure

```bash
# Graceful restart
sudo systemctl restart fidscript-whatsapp

# Hard restart
sudo systemctl stop fidscript-whatsapp
sudo systemctl start fidscript-whatsapp
```

## Next Steps

- Configure [Webhook Integration](./WHATSAPP_WEBHOOK_GUIDE.md)
- Review [API Reference](./WHATSAPP_API_REFERENCE.md)
- Set up [Monitoring and Alerts](./MONITORING.md)
