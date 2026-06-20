# Screen Spec — `DeploymentDomainDetail`

> Per-domain detail at `/dashboard/projects/:id/domains/:d` (F11 — note: distinct from
> `EmailDomain`). The operator's console for one deployment domain: status, DNS, TLS,
> health.

## 1. Purpose
The user inspects one deployment domain — sees its status, DNS records, TLS cert, and
health. The principle: **a domain is a contract between the user's DNS and the platform;
the UI shows both sides.**

## 2. Route + access
- **Route:** `/dashboard/projects/:id/domains/:d`.
- **Permission:** any member (`O/A/D/V`); viewer greys Delete + Connect Cloudflare.
- **Audit gap**: `DOM-05` (Connect Cloudflare) and `DOM-06` (Delete) lack server-side
  access checks; the UI greys for non-A/D.

## 3. Layout
```
┌──────────────────────────────────────────────────────────────────────┐
│ Project › my-app › Domains › acme.com                                │
├──────────────────────────────────────────────────────────────────────┤
│ acme.com  [● active]  DNS: verified · TLS: active · expires 87d    │
│ Routes to: deploy-abc123 · https://acme.com                          │
│ [Verify] [Re-issue cert] [Connect Cloudflare] [Delete]                │
├──────────────────────────────────────────────────────────────────────┤
│ [Overview] [DNS] [TLS] [Email] [Health]                              │
├──────────────────────────────────────────────────────────────────────┤
│ Status                                                               │
│ DNS verified   ● 2d ago                                              │
│ Routing OK     ● 2d ago                                              │
│ SSL active     ● cert issued 2d ago, expires in 87 days              │
└──────────────────────────────────────────────────────────────────────┘
```

## 4. Sections + states
- **Header strip**: domain, status badge, summary (DNS verified · TLS active · expiry),
  deploymentId, Open URL, kebab actions.
- **Tabs**:
  - **Overview** (default): status badges + timestamps + cert expiry.
  - **DNS**: instructions (real IP, not placeholder) + Verify button.
  - **TLS**: cert details + Re-issue button.
  - **Email**: link to Email → Domains (if this domain also serves email).
  - **Health**: recent `DomainHealthCheck` rows; live checks every 10 min server-side.
- **Per-tab states**:
  - **DNS**:
    - *Idle*: instructions + the real IP (`SERVER_IP`).
    - *Verified*: green check + "Verified Xd ago."
    - *Pending*: spinner + "Waiting for DNS propagation…"
  - **TLS**:
    - *Active*: cert details + expiry + Re-issue button.
    - *Pending*: spinner + "Issuing certificate…"
    - *Failed*: error reason + Re-issue button.
  - **Health**:
    - *Empty*: "Health checks run every 10 minutes — first check is on its way."
    - *Live*: rows appear every 10 min.

## 5. Primary + secondary actions
- **Primary (top-right)**: "Verify" (DNS tab) / "Re-issue cert" (TLS tab) — context-driven.
- **Secondary**:
  - "Connect Cloudflare" (DNS tab; **audit gap**).
  - "Delete" (Danger Zone; **audit gap**).

## 6. API mapping
- **Get domain** — `GET /api/v1/domains/:id` (derived from `DOM-01` list response).
- **Get instructions** — `GET /api/v1/domains/:id/instructions` (`DOM-03`).
- **Verify** — `POST /api/v1/domains/:id/verify` (`DOM-04`).
- **Connect Cloudflare** — `POST /api/v1/domains/connect-cloudflare` (`DOM-05`)
  ⚠ **no access check**.
- **Delete** — `DELETE /api/v1/domains/:id` (`DOM-06`) ⚠ **no access check**.
- **Health checks** — `DomainHealthCheck` rows; live checks every 10 min server-side.
- **Realtime** — `domain.added`, `domain.pending_ownership`, `domain.failed`,
  `domain.tls_pending`, `domain.active`, `domain.deleted`.

## 7. Forms + validation
- **Connect Cloudflare**: API token input (the UI should provide a link to Cloudflare's
  token creation page).
- **Delete**: type-to-confirm with the domain name.

## 8. Accessibility
- **Focus order**: header → tabs → tab content → actions.
- **Status badges**: `role="status"` with `aria-label` describing the status.
- **DNS instructions**: copyable code blocks with `aria-label="DNS record"` per record.
- **Audit gap banner**: `role="alert"` for the "DOM-05/06 lack server-side access checks"
  notice (visible to admins/owners, not viewers).

## 9. Cross-references
- **Phase**: F11 Domains UI §6.
- **Service spec**: `docs/product/services/domains.md`.
- **Journey**: team's custom-domain setup.
- **Navigation**: Domains list → click a row.
- **Related screens**: Add domain modal (sibling), Email → Domains (if also serving email).

## 10. Acceptance criteria
1. The detail page opens at `/dashboard/projects/:id/domains/:d`; the **Overview** tab is
   preselected.
2. The header shows the domain, status badge, summary (DNS / TLS / expiry), deploymentId.
3. The DNS tab shows instructions with the **real IP** (not a placeholder).
4. "Verify" POSTs `DOM-04`; status transitions via realtime events.
5. The TLS tab shows cert details + expiry; "Re-issue cert" POSTs the appropriate endpoint.
6. "Connect Cloudflare" is greys for non-A/D per the audit gap.
7. "Delete" is greys for non-A/D per the audit gap.
8. The Health tab shows recent `DomainHealthCheck` rows.
9. The audit-gap notice is visible to admins/owners.
10. Realtime events update the status as DNS / TLS checks complete.