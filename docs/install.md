# Installation Guide

Complete guide for installing FIDScript Deploy on a VPS.

## Prerequisites

Before starting, ensure you have:

1. **A VPS** with Ubuntu 22.04 or later
2. **A domain name** pointed to your server's IP
3. **SSH access** to your server

## Step 1: DNS Configuration

Before installing, create DNS records for your domain:

| Record | Type | Value |
|--------|------|-------|
| `@` | A | `YOUR_SERVER_IP` |
| `api` | A | `YOUR_SERVER_IP` |
| `storage` | A | `YOUR_SERVER_IP` |
| `mail` | A | `YOUR_SERVER_IP` |

Replace `YOUR_SERVER_IP` with your server's IP address.

## Step 2: Run Installer

SSH into your server and run:

```bash
curl -sSL https://install.fidscript.dev | bash
```

The installer will:

1. Detect your OS and install dependencies (Docker, Docker Compose)
2. Create necessary directories
3. Run the setup wizard

## Step 3: Setup Wizard

The setup wizard will ask for:

- **Domain** - Your platform domain (e.g., `deploy.example.com`)
- **Admin Email** - Platform administrator email
- **Admin Password** - Secure password (minimum 12 characters)
- **Cloudflare API token** - Optional. Skipped means SSL uses the HTTP-01 challenge and you create the DNS records yourself.

## Step 4: Start Services

After setup completes:

```bash
cd /opt/fidscript-deploy/installer/docker
docker compose up -d --build
```

The compose file lives in the git checkout, not in a copy of it: the API
and dashboard images are built from the monorepo root, so the build
context has to resolve to the repository. `/opt/fidscript` is a symlink
to the checkout's `installer/` directory.

## Step 5: Verify Installation

Wait 2-3 minutes for services to initialize, then:

1. Visit `https://your-domain.com`
2. Login with your admin credentials

## Services Overview

| Service | URL | Purpose |
|---------|-----|---------|
| Dashboard | `https://your-domain.com` | Web interface |
| API | `https://api.your-domain.com` | REST API |
| Storage | `https://storage.your-domain.com` | Object storage console (RustFS) |
| Traefik | `http://your-ip:8080` | Proxy dashboard |

## Default Ports

| Port | Service | Notes |
|------|---------|-------|
| 22 | SSH | Server access |
| 80 | HTTP | Redirects to HTTPS |
| 443 | HTTPS | Encrypted traffic |
| 8080 | Traefik | Dashboard (local only) |

## Data Storage

Persistent state lives in **named Docker volumes**, not in a host
directory. List them with `docker volume ls | grep fidscript`:

| Volume | Holds |
|--------|-------|
| `fidscript_postgres` | Database files |
| `fidscript_redis` | Cache data |
| `fidscript_nats` | Event data (JetStream) |
| `fidscript_minio` | Object storage (RustFS) |
| `fidscript_stalwart` | Mail data |

## Updating

To update FIDScript Deploy:

```bash
cd /opt/fidscript-deploy
git pull
cd installer/docker
docker compose pull
docker compose up -d --build
```

## Backup

Back up your data regularly:

```bash
docker run --rm -v fidscript_postgres:/data:ro -v "$PWD":/backup \
  postgres:16-alpine pg_dumpall -U fidscript > "fidscript-backup-$(date +%Y%m%d).sql"
```

## Troubleshooting

### Installation fails

Check system requirements:
```bash
docker info
docker compose version
```

### Dashboard not loading

Check Traefik logs:
```bash
docker logs fidscript_traefik
```

### SSL certificate errors

Check ACME logs:
```bash
docker exec fidscript_traefik cat /acme/acme.json
```

### Database connection errors

Verify PostgreSQL is healthy:
```bash
docker exec fidscript_postgres pg_isready
```

## Next Steps

- [Configure your first project](./guides/first-project.md)
- [Set up custom domains](./guides/custom-domains.md)
- [Configure email settings](./guides/email.md)
