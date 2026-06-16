# Product Requirements

## Vision

FIDScript Deploy exists to eliminate the operational burden of managing application infrastructure.

Developers should focus entirely on writing business logic, not configuring databases, email servers, queues, caches, or deployment pipelines. Every infrastructure concern should be a first-class platform service that applications consume through simple interfaces.

The platform transforms a commodity VPS into a complete Developer Operating System where applications deploy, databases provision, emails send, queues process, and events flow without manual intervention.

---

## Problems Solved

### Per-App Infrastructure Duplication

Every team deploying to cloud providers pays for dedicated database instances, cache clusters, email services, and queue systems per application. Infrastructure costs multiply with every new project.

**Solution:** Shared platform infrastructure where all applications consume the same PostgreSQL, Redis, NATS, and Stalwart instances, each isolated logically through the platform's multi-tenant architecture.

### Deployment Complexity

Deploying an application requires configuring build systems, container registries, load balancers, SSL certificates, and DNS routing. Each deployment tool has different requirements.

**Solution:** One deployment interface that handles Git connection, build detection, container building, domain routing, and SSL provisioning automatically through buildpacks and Traefik.

### No Unified Backend Services

Application teams needing email, authentication, storage, or realtime capabilities build their own or subscribe to multiple third-party services. Each integration has different APIs, SDKs, and billing models.

**Solution:** Unified platform services with consistent APIs, SDK methods, and dashboard interfaces. Applications access email through `platform.email.send()`, authentication through `platform.auth.*`, and storage through `platform.storage.*`.

### Fragmented Developer Experience

Cloud platforms excel at deployment but lack integrated backend services. Backend-as-a-Service platforms excel at auth and databases but lack deployment control. Developers use three to five tools where one should suffice.

**Solution:** Single platform providing deployment, backend services, realtime, email, storage, queues, cron, functions, monitoring, logging, and AI assistance through Dashboard, API, SDK, CLI, MCP, and AI Agents.

---

## Target Users

### Individual Developers

Solo developers building SaaS applications, portfolio projects, or freelance client work. They want production-quality infrastructure without DevOps expertise.

**Pain Point:** Cannot justify $50-200/month for cloud services when building alone.

**Solution:** VPS hosting at $6-20/month with all infrastructure included.

### Development Agencies

Teams building multiple client projects simultaneously. Each client needs isolated infrastructure, but managing separate cloud accounts is overhead.

**Pain Point:** Client projects get mixed billing, access controls are complex, and separating infrastructure per client is expensive.

**Solution:** Platform projects are naturally isolated. One VPS serves all clients with project-level access control.

### Internal Company Platforms

Engineering teams building internal tools, APIs, or microservices. They need deployment pipelines and backend services without cloud complexity.

**Pain Point:** Bureaucratic cloud procurement vs. the speed they need.

**Solution:** Self-hosted on company infrastructure. Full control without vendor procurement cycles.

### Self-Hosting Enthusiasts

Developers who prefer owning their infrastructure over renting it. They value privacy, cost control, and learning how systems work.

**Pain Point:** Self-hosting each service (PostgreSQL, Redis, email, etc.) requires significant configuration and maintenance.

**Solution:** One installation provides the full stack. Updates and backups are platform-managed.

### SaaS Founders

Technical founders building multi-tenant SaaS products. They need the scalability of cloud platforms with the cost control of self-hosting.

**Pain Point:** Cloud costs scale linearly with customers. Self-hosting has predictable costs.

**Solution:** Platform isolates tenant data while sharing infrastructure efficiently. White-label capabilities for hosting multiple customer products.

---

## Success Metrics

### Time to First Deployment

**Definition:** Minutes from VPS installation to first publicly accessible application deployment.

**Target:** Under 10 minutes from `curl` command to live URL.

**Measurement:** User timestamps in installer logs and deployment records.

### Projects Hosted

**Definition:** Total projects created across all FIDScript Deploy installations.

**Target:** 10,000 projects within 12 months of stable release.

**Measurement:** Anonymous telemetry (opt-in) or community forum reports.

### Deploy Success Rate

**Definition:** Percentage of deployment attempts resulting in live applications.

**Target:** 98% success rate for deployments using buildpacks.

**Measurement:** `deployment.succeeded` / (`deployment.succeeded` + `deployment.failed`) events.

### API Adoption

**Definition:** Ratio of API calls to dashboard actions.

**Target:** 60% of platform interactions through API within 6 months of release.

**Measurement:** Request logs filtered by `User-Agent: FIDScript-SDK` vs. browser sessions.

### SDK Adoption

**Definition:** Active projects using the JavaScript/TypeScript SDK.

**Target:** 40% of deployed applications using platform SDK.

**Measurement:** SDK initialization calls tracked anonymously.

---

## Out of Scope (v1.0)

These features are planned for future releases but not v1.0:

- Kubernetes orchestration (Docker/Docker Compose only for v1.0)
- Multi-VPS clustering (single VPS focus)
- White-label billing/invoicing
- Mobile applications
- GraphQL API (REST only for v1.0)
- Webhooks v2 (v1.0 has basic webhook support)
- Custom deployment strategies beyond buildpacks/Dockerfile
- Database branching/preview environments

---

## Non-Goals

FIDScript Deploy explicitly does not aim to:

- Compete with AWS/GCP/Azure on raw compute scale
- Replace GitHub/GitLab for source control
- Be a DNS provider or domain registrar
- Provide content delivery networks (CDN)
- Offer managed Kubernetes
- Build mobile SDKs beyond the JavaScript/TypeScript SDK
