# Platform Philosophy — FIDScript

> **North star.** Every later document (journeys, navigation, service specs, screen/component specs,
> F00–F11) must be consistent with this file. If a design choice contradicts a principle here, the
> choice is wrong — change the choice, not the principle. Update this file only by deliberate decision.

## What FIDScript is

FIDScript is a **self-hosted backend-as-a-service**: the capabilities you'd otherwise rent from a
dozen SaaS vendors — deployments, databases, edge functions, realtime, queues, cron, mail, storage,
auth, monitoring — bundled into **one open-source stack that runs entirely on a VPS you own**.

It is **not** a hosting panel (Coolify/CapRover) and **not** a pure BaaS SDK (Supabase/Firebase). It is
the **intersection**: a developer platform with a BaaS-grade API + SDK + MCP, that you operate
yourself, on your own hardware, with no vendor between you and your data.

## Who it's for (and not for)

**For:** developers and small teams who want Supabase-class capabilities without the recurring bill,
the data residency questions, or the lock-in — and who have (or can rent) one VPS.
**Not for (yet):** multi-region clusters, enterprise SSO/SAML, or zero-ops autoscaling. Document these
as future scope so we never imply they exist.

## How we differ from the comparators

| Platform | What they are | Where FIDScript is deliberately different |
|---|---|---|
| **Supabase** | Hosted Postgres + auth + storage + functions | Same surface, **self-hosted**, one command, your data — and a **full app platform** (deployments, mail, queues, cron, monitoring) Supabase doesn't bundle. |
| **Convex / InstantDB** | Reactive/hosted DB + functions | We give a **standard Postgres** (portable, no proprietary query layer) plus queues/cron/mail/realtime they don't ship. |
| **Firebase** | Google-locked BaaS | **No vendor lock-in**: standard Postgres, MinIO (S3), NATS, Redis, Docker, Traefik — migrate away anytime. |
| **Railway / Render** | Hosted app deployment | We deploy **and** provide the BaaS data plane (db/functions/queues/realtime) they expect you to wire up separately. |
| **Vercel** | Hosted frontend/edge | We host the **backend** too, and you own the box; Vercel is a possible *frontend* host that deploys onto FIDScript. |
| **Cloudflare Workers** | Edge runtime only | Functions here are **sandboxed but on your metal**; plus the full data plane, not just compute. |

**The one-line differentiator:** *Configure once. Own everything. Production-ready by default — on a
single VPS, fully open source.*

---

## The five principles

### Principle 1 — Configure once. Never configure again.
A single input (the **domain**, set during install) fans out to configure every dependent service.
The user never re-enters it, and never configures a downstream service by hand.

**The "one domain → everything" fan-out map** (this is the contract the platform must uphold):

| One config: `domain` | Automatically configures |
|---|---|
| **SSL/TLS** | Traefik ACME obtains Let's Encrypt certs for the domain + `*.apps.<domain>` (DNS-01 via Cloudflare). No manual certs. |
| **Email** | `mail.<domain>` MX/DKIM/SPF/DMARC, sender identities, magic-code delivery, inbound webhooks. |
| **Deployments** | Each project serves at `<slug>.apps.<domain>` with TLS. |
| **Functions** | Invoke URLs under the platform domain. |
| **API URLs** | `https://<domain>/api/v1/...` — stable, documented, same everywhere. |
| **Storage** | `storage.<domain>` external MinIO endpoint + presigned URLs resolve publicly. |
| **Webhooks** | Outbound + inbound (email events) rooted at the domain. |
| **Realtime** | `/realtime` socket on the platform domain. |

**Design rule:** if a feature needs a setting that another setting already implies, **infer it** —
don't ask. If two settings must stay in sync, **synchronize them automatically** (e.g. rotating DB
creds rewrites the project's `DATABASE_URL`). Advanced overrides exist but are collapsed/hidden by
default.

### Principle 2 — Beginner first. Hide complexity.
The default screen shows the **5 things a beginner needs**; the 50 things an expert might want are one
click deeper, collapsed, or in a "Advanced" disclosure. A non-DevOps person should be able to: install,
create a project, deploy an app, and read its logs — without ever editing YAML, a Dockerfile, or a
connection string. Complexity is available, never forced.

### Principle 3 — Production-ready by default.
Defaults are safe for production, not "dev-easy." No manual SSL, no manual Docker, no manual networking,
no insecure default credentials left standing. The install admin gets **temp creds + forced change**.
Backups, retention, health checks, and resource limits are **on** out of the box. "It works on my box"
and "it's production-ready" must be the same state.

### Principle 4 — Everything is observable.
Every action emits a typed event; every service exposes health; logs/metrics are first-class. Nothing
happens silently: a deploy, a function invocation, a database rotation, a bounce — all leave an
observable trail (events → audit, logs, realtime fan-out). When something fails, the user can see *why*
without SSH. **"Magic" is forbidden** — every automation is documented and has a visible result.

### Principle 5 — One dashboard. One source of truth.
Everything the platform does is managed from **one console** at the platform domain — no separate
MinIO console hop, no hand-editing Traefik, no SSH-to-restart. Where a third-party UI exists (MinIO
console), it's either embedded/proxied or its essential actions are surfaced natively. The dashboard
**is** the platform.

---

## Implications that follow from these principles

- **No OAuth in the platform console login** (Principle 2): one less thing to configure. OAuth stays
  available for *customer* apps (BaaS), configured per-project — not for logging into FIDScript itself.
- **Magic-code over magic-link** (Principle 4 + honesty): the platform magic-link is broken in the
  backend; a typed code is faster and observable. We standardize on magic-**code**.
- **Temp creds + forced change** (Principle 3): the installer generates, prints, and flags
  `mustChangePassword`; first login forces a change. No standing defaults.
- **Inference over configuration** (Principle 1): e.g. DB provisioning auto-injects `DATABASE_URL` into
  the project env; domain verification auto-configures email DNS; a deploy auto-routes + TLS.
- **Honest empty states** (Principle 4): if a backend capability is missing, the UI says so plainly
  (e.g. "Skills — not yet available"), never a fake screen.

## Non-goals (explicit, so we don't drift)

Multi-region clustering, SAML/enterprise SSO, a hosted/managed offering, WebAuthn/passkeys, phone/SMS
auth, per-row RLS UI, and a visual drag-and-drop builder. These may come; until they're specced and
built, the product does not claim them.
