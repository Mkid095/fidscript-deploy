# FIDScript Deploy Installer

One-command installation for FIDScript Deploy on any VPS.

## Quick Start

```bash
curl -sSL https://deploy.fidscript.com/install.sh | bash
```

## Requirements

| Requirement | Minimum | Recommended |
|-------------|---------|-------------|
| CPU | 2 cores | 4+ cores |
| RAM | 4 GB | 8+ GB |
| Disk | 40 GB | 100+ GB SSD |
| OS | Ubuntu 22.04 | Ubuntu 24.04 |

> The dashboard image runs `next build` during installation. Budget ~3 GB of
> free RAM for that step, or the build will fail rather than silently swap.

## What Gets Installed

| Component | Port | Description |
|-----------|------|-------------|
| Traefik | 80, 443 | Reverse proxy with SSL |
| docker-proxy | — | Bridges the Docker socket to TCP for Traefik's Docker provider |
| PostgreSQL | 5432 | Primary database |
| PgBouncer | 6432 | Connection pooler |
| Redis | 6379 | Cache and sessions |
| NATS | 4222, 8222 | Event bus and queues |
| RustFS | 9000, 9001 | S3-compatible object storage |
| Stalwart | 25, 587, 993 | Mail server |
| API | 3001 | Backend service |
| Dashboard | 3001 | Web interface |

Optional components (WhatsApp, observability) are **add-ons** and are not
part of the core install — see `installer/addons/`.

## Installation Steps

1. **Run the installer:**
   ```bash
   curl -sSL https://deploy.fidscript.com/install.sh | bash
   ```

2. **Follow the setup wizard:**
   - Enter your domain (e.g., `deploy.example.com`)
   - Set admin email and a password of at least 12 characters
   - Optionally supply a Cloudflare API token (otherwise SSL uses the
     HTTP-01 challenge and you create the DNS records yourself)

3. **Start services** — the installer does this for you. To do it by hand:
   ```bash
   cd /opt/fidscript-deploy/installer/docker
   docker compose up -d --build
   ```

4. **Access your dashboard:**
   ```
   https://deploy.example.com
   ```

## Manual Installation

If you prefer to install manually:

```bash
# Clone the repository
git clone https://github.com/Mkid095/fidscript-deploy.git /opt/fidscript-deploy
cd /opt/fidscript-deploy

# Run setup wizard
sudo installer/scripts/setup-wizard.sh

# Start services
cd installer/docker
docker compose up -d --build
```

## Layout on the Server

```
/opt/fidscript-deploy/          # the git checkout — this is the install
├── apps/  packages/            # source for the API and dashboard images
└── installer/
    ├── scripts/                # install.sh, setup-wizard.sh, health-check.sh
    ├── config/stalwart/        # mail server config template
    ├── addons/                 # optional components (not installed by default)
    └── docker/                 # the compose stack
        ├── docker-compose.yml
        ├── .env                # generated (gitignored)
        ├── secrets/            # generated (gitignored)
        └── traefik/            # generated routing config
/opt/fidscript -> /opt/fidscript-deploy/installer
```

`/opt/fidscript` is a symlink so the documented paths keep working. The
compose file runs from the checkout because the API and dashboard images
are built from the **monorepo root** — both Dockerfiles copy
`package.json`, `pnpm-lock.yaml` and `packages/`, so the build context
has to be the repository.

## Configuration

Configuration is stored in `/opt/fidscript/docker/.env`
(= `/opt/fidscript-deploy/installer/docker/.env`):

```env
DOMAIN=deploy.example.com
ADMIN_EMAIL=admin@example.com
AUTO_SSL=true
```

## Secrets Management

All credentials are **server-side only** — they are NEVER committed to the
repo. The Docker compose wires them through two mechanisms:

| Mechanism | Where | Used by |
|-----------|-------|---------|
| `env_file: ./secrets/api.env` (gitignored) | `installer/docker/secrets/api.env` | api container |
| Docker `secrets:` block + `*_FILE` env vars pointing at `/run/secrets/<name>` (gitignored `installer/docker/secrets/*.txt`) | compose-managed per-service secrets | postgres, redis, traefik, api, stalwart |

`setup-wizard.sh` generates every secret on a fresh install. To create
them by hand:

```bash
cd /opt/fidscript/docker
for s in postgres_password redis_password minio_access_key minio_secret_key \
         jwt_secret encryption_key stalwart_admin_token stalwart_webhook_secret \
         system_mailbox_password smtp_submission_pass cf_api_token; do
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
cd /opt/fidscript-deploy
git pull
cd installer/docker
docker compose pull
docker compose up -d --build
```

## Uninstall

To remove FIDScript Deploy:

```bash
cd /opt/fidscript/docker
docker compose down -v
rm -rf /opt/fidscript /opt/fidscript-deploy
```

Data lives in named Docker volumes — `docker compose down -v` removes them.
If you use `-v` deliberately, that is the destructive step; without it the
volumes survive and can be reused.

## Troubleshooting

### Services won't start

Check logs:
```bash
docker compose logs
```

### The mail server will not start

Stalwart is configured from `installer/config/stalwart/config.toml`,
which the setup wizard renders (it needs `python3-bcrypt` to hash the admin
token). If that file is missing, Compose fails fast rather than starting
Stalwart with an empty config. Re-run the wizard to regenerate it.

### SSL certificate issues

Check Traefik logs:
```bash
docker logs fidscript_traefik
```

### Deployed apps get no URL

Traefik's static config must include the `docker` provider — that is what
makes Traefik discover containers labelled `traefik.enable=true`. The
setup wizard writes it; check `installer/docker/traefik/traefik.yml`.

### Port conflicts

Check if ports are in use:
```bash
sudo netstat -tulpn | grep -E ':(80|443|22)\s'
```

## Support

- Documentation: https://docs.fidscript.dev
- Issues: https://github.com/Mkid095/fidscript-deploy/issues
