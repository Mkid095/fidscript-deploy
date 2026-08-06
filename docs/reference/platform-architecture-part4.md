# FIDScript Deploy — Platform Architecture Documentation (Part 4)

## 15. Organization & Permissions

### Backend System

Strict hierarchy:
- **Installation:** Root entity (self-hosted instance)
- **Organizations:** Groups of users sharing billing/infrastructure
- **Projects:** Actual application deployments and backend services

**Database Schema:**
- `organizations` (id, name, created_at)
- `members` (id, organization_id, user_id, role)
- `projects` (id, organization_id, name, created_at)

**Roles:** Owner, Admin, Developer, Viewer

### Frontend Components

1. **Organization Settings**
   - Member list with roles
   - "Invite Member" → creates pending invitation + sends email

2. **Project Permissions**
   - Per-project role assignment
   - Backend middleware checks permissions before any API request

---

## 16. Onboarding Flow

Seamless and automated — no manual infrastructure setup.

```
User clicks "Create New Project"
    → POST /api/projects
    → Project record created
    → PostgreSQL schema created
    → project-assets bucket created
    → project:{id} realtime namespace initialized
    → Public + server API keys generated
    → "project.provisioned" event emitted
    → Frontend: "Provisioning..." → receives event → redirects to Project Dashboard
```

---

## 17. Settings and Build System

### Settings Page Architecture

Strictly project-scoped. Never global unless Installation Admin.

**Required Sections:**
- **General:** Project name, description, primary domain
- **Environment Variables:** Encrypted storage + CLI integration
- **Build Settings:** Framework detection, build commands, output directories
- **Members:** Per-project role assignment
- **Danger Zone:** Delete project

### Build System Architecture

Multi-language/framework support (Next.js, Node, Python, Static).

**CI/CD Pipeline:**
1. GitHub webhook receives `push`
2. Job added to `deployment` queue
3. Build worker container spins up, clones repo, detects framework
4. Runs build command in isolated environment
5. Output packaged and stored as artifact
6. Health check verifies deployment
7. API Gateway routes domain to new deployment

**Version Management:**
- Stores Git Commit Hash + Build Metadata (not unlimited full builds)
- **Instant Rollback:** Updates routing table to previous artifact — no rebuild needed

---

## 18. Subdomain Management

Flexible domain routing: one main domain + multiple subdomains.

### Backend System

- Main domain: `example.com` → primary project
- Subdomains: `api.example.com`, `app.example.com` → custom hostnames under same Cloudflare zone

### Frontend Components

1. **Domain Management Page**
   - Primary domain display + subdomain list
   - "Add Subdomain" button
   - Backend creates custom hostname in Cloudflare
   - SSL provisioned, routing updated

---

## 19. Final Audit Deliverables

1. **Service Status Report** — Complete / Partial / Broken per service
2. **Wiring Diagram** — Event flow between services
3. **Missing Implementation List** — P0 Critical, P1 Blockers, P2 Improvements
4. **UI Audit** — Data sources, API calls, loading/empty states, permissions, project context
5. **Production Readiness Score** — Backend, Frontend, Infrastructure, DX, Security

---

## References

- Vercel Instant Rollback: https://vercel.com/docs/instant-rollback
- Cloudflare for SaaS: https://developers.cloudflare.com/cloudflare-for-platforms/cloudflare-for-saas/
- Secrets Management Encryption: https://medium.com/codetodeploy/building-a-secrets-management-platform-encryption-key-hierarchy-and-access-control-43a85bb38177
