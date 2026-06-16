# System Requirements

Hardware and software requirements for FIDScript Deploy.

## Supported Operating Systems

| OS | Version | Support |
|----|---------|---------|
| Ubuntu | 22.04 LTS | Full |
| Ubuntu | 24.04 LTS | Full |
| Debian | 11 (Bullseye) | Compatible |
| Debian | 12 (Bookworm) | Compatible |

## Hardware Requirements

### Minimum

| Resource | Requirement |
|----------|-------------|
| CPU | 2 cores |
| RAM | 4 GB |
| Disk | 40 GB |
| Network | 1 Gbps |

### Recommended

| Resource | Requirement |
|----------|-------------|
| CPU | 4+ cores |
| RAM | 8+ GB |
| Disk | 100+ GB SSD |
| Network | 1 Gbps |

### Production

| Resource | Requirement |
|----------|-------------|
| CPU | 8+ cores |
| RAM | 16+ GB |
| Disk | 500+ GB NVMe SSD |
| Network | 10 Gbps |

## Software Requirements

### Required

| Software | Version | Purpose |
|----------|---------|---------|
| Docker | 24.0+ | Container runtime |
| Docker Compose | 2.20+ | Orchestration |
| curl | Any | Downloads |
| openssl | Any | Secrets generation |

### Optional

| Software | Purpose |
|----------|---------|
| UFW | Firewall management |
| fail2ban | SSH brute-force protection |

## Network Requirements

### Ports

| Port | Protocol | Required | Purpose |
|------|----------|----------|---------|
| 22 | TCP | Yes | SSH access |
| 80 | TCP | Yes | HTTP (Let's Encrypt) |
| 443 | TCP | Yes | HTTPS |
| 8080 | TCP | No | Traefik dashboard (local only) |

### DNS Records

Your domain must have:

- **A record** pointing to server IP for main domain
- **CNAME** for `api` subdomain
- **CNAME** for `storage` subdomain
- **MX record** for mail (optional)

### Bandwidth

| Usage | Minimum |
|-------|---------|
| Light | 500 GB/month |
| Medium | 2 TB/month |
| Heavy | 10 TB/month+ |

## Cloud Provider Compatibility

| Provider | Tested | Notes |
|----------|--------|-------|
| Hetzner | Yes | CX21 recommended |
| DigitalOcean | Yes | Droplet 4GB recommended |
| AWS EC2 | Yes | t3.medium recommended |
| Vultr | Yes | 4GB plan recommended |
| Linode | Yes | 4GB plan recommended |
| Google Cloud | Compatible | e2-medium recommended |
| Azure | Compatible | B2s recommended |

## Container Resources

Each service has the following base allocations:

| Service | CPU | RAM | Disk |
|---------|-----|-----|------|
| Traefik | 0.5 | 256MB | - |
| PostgreSQL | 1 | 512MB | 10GB |
| Redis | 0.5 | 256MB | 1GB |
| NATS | 0.5 | 256MB | 1GB |
| MinIO | 1 | 512MB | 20GB |
| Stalwart | 1 | 1GB | 5GB |
| API | 2 | 1GB | - |
| Dashboard | 1 | 512MB | - |

**Total minimum: ~6.5 CPU, ~3.5GB RAM, ~40GB disk**

## Additional Considerations

### CPU

- AMD64/Intel x86_64 required
- ARM64 (Graviton) compatible
- AVX2 recommended for encryption

### RAM

- Swap file recommended if < 4GB
- ECC RAM preferred for database

### Disk

- SSD/NVMe strongly recommended
- Separate data partition recommended
- RAID for production data recommended

### Security

- Root access required for installation
- SSH key authentication recommended
- Firewall configuration required
- Regular security updates needed
