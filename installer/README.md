# FIDScript Deploy Installer

One-command installation for FIDScript Deploy on any VPS.

## Quick Start

```bash
curl -sSL https://install.fidscript.dev | bash
```

## Requirements

| Requirement | Minimum | Recommended |
|-------------|---------|-------------|
| CPU | 2 cores | 4+ cores |
| RAM | 4 GB | 8+ GB |
| Disk | 40 GB | 100+ GB SSD |
| OS | Ubuntu 22.04 | Ubuntu 24.04 |

## What Gets Installed

| Component | Port | Description |
|-----------|------|-------------|
| Traefik | 80, 443 | Reverse proxy with SSL |
| PostgreSQL | 5432 | Primary database |
| Redis | 6379 | Cache and sessions |
| NATS | 4222, 8222 | Event bus and queues |
| MinIO | 9000, 9001 | Object storage |
| Stalwart | 25, 587, 993 | Mail server |
| API | 3001 | Backend service |
| Dashboard | 3000 | Web interface |

## Installation Steps

1. **Run the installer:**
   ```bash
   curl -sSL https://install.fidscript.dev | bash
   ```

2. **Follow the setup wizard:**
   - Enter your domain (e.g., `deploy.example.com`)
   - Set admin email and password
   - Choose storage path

3. **Start services:**
   ```bash
   cd /opt/fidscript/docker
   docker compose up -d
   ```

4. **Access your dashboard:**
   ```
   https://deploy.example.com
   ```

## Manual Installation

If you prefer to install manually:

```bash
# Clone the repository
git clone https://github.com/fidscript/deploy.git
cd deploy/installer

# Run setup wizard
sudo scripts/setup-wizard.sh

# Start services
cd docker
docker compose up -d
```

## Configuration

Configuration is stored in `/opt/fidscript/.env`:

```env
DOMAIN=deploy.example.com
ADMIN_EMAIL=admin@example.com
STORAGE_PATH=/data/fidscript
AUTO_SSL=true
```

## Secrets Management

All credentials are **server-side only** — they are NEVER committed to the
repo. The Docker compose wires them through two mechanisms:

| Mechanism | Where | Used by |
|-----------|-------|---------|
| `env_file: ./secrets/api.env` (gitignored) | `installer/docker/secrets/api.env` | api + whatsapp-api containers |
| Docker `secrets:` block + `*_FILE` env vars pointing at `/run/secrets/<name>` (gitignored `installer/docker/secrets/*.txt`) | compose-managed per-service secrets | postgres, redis, minio, traefik, api, stalwart |

To populate secrets on a fresh server:

```bash
# Generated automatically by setup-wizard.sh — or run manually:
cd /opt/fidscript/docker
for s in postgres_password redis_password minio_access_key minio_secret_key \
         jwt_secret encryption_key stalwart_admin_token stalwart_webhook_secret \
         stalwart_credentials cf_api_token; do
  if [ ! -f "secrets/${s}.txt" ]; then
    openssl rand -hex 32 > "secrets/${s}.txt"
    chmod 600 "secrets/${s}.txt"
  fi
done

# Copy the template + fill in real values
cp .env.example .env
cp secrets/api.env.example secrets/api.env
$EDITOR .env secrets/api.env
chmod 600 .env secrets/api.env
```

**Never commit `.env`, `secrets/*.txt`, or `secrets/api.env`** — they are
in `.gitignore`. The commit-safe templates are `.env.example` and
`secrets/api.env.example`. To rotate a secret: edit the value on disk and
`docker compose up -d`; the running services pick up the new credential.


## Health Check

Check service status:

```bash
/opt/fidscript/scripts/health-check.sh
```

## Firewall

Configure firewall (optional but recommended):

```bash
/opt/fidscript/scripts/configure-firewall.sh
```

## Updating

To update to a new version:

```bash
cd /opt/fidscript
git pull
docker compose pull
docker compose up -d
```

## Uninstall

To remove FIDScript Deploy:

```bash
cd /opt/fidscript/docker
docker compose down -v
rm -rf /opt/fidscript
rm -rf /data/fidscript
```

## Troubleshooting

### Services won't start

Check logs:
```bash
docker compose logs
```

### SSL certificate issues

Check Traefik logs:
```bash
docker logs fidscript_traefik
```

### Port conflicts

Check if ports are in use:
```bash
sudo netstat -tulpn | grep -E ':(80|443|22)\s'
```

## Support

- Documentation: https://docs.fidscript.dev
- Issues: https://github.com/fidscript/deploy/issues
- Discord: https://fidscript.dev/discord
