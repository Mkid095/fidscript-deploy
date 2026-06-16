# Phase 02: Installer System

**Status:** Planned

**Blocked By:** Phase 01

---

## Objective

Create a one-command VPS installation experience using Docker and Docker Compose.

---

## Deliverables

- [ ] Docker Compose configuration for all services
- [ ] Traefik configuration with Let's Encrypt
- [ ] Bootstrap service for initialization
- [ ] System health checks
- [ ] Setup wizard (CLI-based)
- [ ] SSL automation
- [ ] Firewall configuration
- [ ] Installer script (curl -sSL https://install.fidscript.dev | bash)

---

## Components to Install

| Component | Technology | Purpose |
|-----------|------------|---------|
| Traefik | Docker | Reverse proxy, SSL |
| PostgreSQL | Docker | Primary database |
| Redis | Docker | Cache, sessions |
| NATS | Docker | Event bus, queues |
| MinIO | Docker | Object storage |
| Stalwart | Docker | Mail server |
| API | Docker | Backend service |
| Dashboard | Docker | Frontend |

---

## Setup Flow

1. **Domain Configuration** - Enter platform domain
2. **Admin Account** - Create admin email/password
3. **SSL Setup** - Let's Encrypt auto-provision
4. **Storage Path** - Configure data directory
5. **Health Check** - Verify all services
6. **Done** - Platform ready

---

## Success Criteria

- [ ] Fresh Ubuntu 22.04 installs successfully
- [ ] All services start and communicate
- [ ] Dashboard accessible at domain
- [ ] API accessible at api.domain
- [ ] SSL certificate provisioned
- [ ] Installer script is idempotent (re-run safe)

---

## Dependencies

- Phase 01 (monorepo) complete

---

## Testing Requirements

- [ ] Test on fresh Hetzner VPS
- [ ] Test on fresh DigitalOcean VPS
- [ ] Test on fresh AWS EC2
- [ ] Test re-run on existing installation
- [ ] Test installer with custom domain

---

## Documentation Updates Required

- [ ] installer/README.md created
- [ ] docs/install.md created
- [ ] docs/requirements.md created (VPS requirements)

---

## Next Phase

[Phase 03: Identity & Access](./phase-03.md)
