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
