# Consolidating everything onto one host and one domain

There is no second VPS. Everything — the FIDScript platform, the Instant
BaaS, the WhatsApp platform, the npm registry and the Maven repository —
runs on this one box, and it all has to be reachable under **one domain**.

This is the plan, and the state of each step.

---

## 1. What is on the box right now

| Compose project | Config | Services |
|---|---|---|
| `docker` | `/opt/fidscript-deploy/installer/docker/` | **the FIDScript platform** — Traefik, the API, the dashboard, Postgres, pgbouncer, redis, nats, MinIO, Stalwart |
| `self-hosting` | `instant/self-hosting/docker-compose.with-caddy.yml` | Instant's Postgres, the Instant server, the www console, RustFS, the Maven repository, and Caddy (**stopped**) |
| `next-mavens-evolution-api` | `/home/whatsapp/next-mavens-evolution-api/` | the Evolution API, its Postgres and Redis, the WhatsApp console |
| `nextmavens-registry` | `/opt/nextmavens-registry/` | Verdaccio (the npm registry) |

**The platform's Traefik holds 80 and 443.** It replaced Caddy as the edge on
2026-11-05 (§4a). Caddy is stopped but still on disk, so the edge can be
rolled back in one command.

## 2. The DNS is already right

Every hostname below already points at this box (72.61.89.110). The DNS was
configured for the consolidated shape before the edge was.

| Hostname | Now (before the cutover) | Now |
|---|---|---|
| `fidscript.com` (the apex) | 525 | **the dashboard ✓** |
| `app.fidscript.com` | 525 | **the dashboard ✓** |
| `api.fidscript.com` | 525 | **the API ✓** |
| `mail.` `imap.` `jmap.` `stalwart-admin.fidscript.com` | 525 | **the mail server ✓** |
| `storage.fidscript.com` | 525 | **the MinIO console ✓** |
| `*.apps.fidscript.com` | 525 | **the deployed applications ✓** |
| `instant.fidscript.com` | 307 | 307 ✓ |
| `apiinstant.fidscript.com` | 200 | 200 ✓ |
| `registry.nextmavens.com` | 200 | 200 ✓ — route published; certificate pending |
| `storage.nextmavens.com` | 502 | 502 — the host service is down |
| `whatsapp.nextmavens.com` | 200 | 200 ✓ — route published; certificate pending |

**525** means Cloudflare cannot complete TLS with the origin: Caddy had no
site block and no certificate for those names. They were not "broken" so much
as *unserved* — and they are served now.

Two wildcards were added today for the platform's applications:

- `*.fidscript.com` → this box (so any new service resolves without a
  DNS change)
- `*.apps.fidscript.com` → this box (the applications themselves, at
  `{slug}.apps.fidscript.com`)

The `apps.` prefix is deliberate: a bare `*.fidscript.com` route would
out-prioritise the platform's own `api.` / `mail.` / `jmap.` names,
because Traefik ranks routers by rule length.

## 3. The target

```
                       one domain: fidscript.com
                                   │
                     ┌─────────────┴──────────────┐
              fidscript.com                 *.apps.fidscript.com
              the platform's dashboard       the customer's apps
              api.fidscript.com             (their own deployments)
              mail. imap. jmap. storage.
                     │
              ONE edge: Traefik (80/443)
                     │
   ┌─────────┬───────┴────────┬──────────────┬───────────────┐
 platform  Instant          WhatsApp       npm registry   Maven repo
```

Every product keeps its own console and its own data. What changes is that
**there is one proxy and one set of certificates**, and the platform's
dashboard links to the others.

### Why Traefik becomes the edge rather than Caddy staying

Caddy is the edge today and already has certificates for the hostnames it
serves. Leaving it in front would mean:

- two proxies (Caddy → Traefik → the platform),
- Traefik's own ACME and certificates bypassed, and its routers switched
  to plain HTTP,
- the CF token needed in two places.

Retiring Caddy gives one proxy, one certificate set (Traefik already holds
the Cloudflare token and can issue DNS-01 certificates for every name),
and one routing model — which is what "package everything together" means.

**The cost:** Traefik must reach the other stacks' containers, so it joins
their networks, and it must be given static routes for the hostnames those
products serve. That is `installer/config/traefik/products.yml`.

The platform-relative hostnames in that file are a `__DOMAIN__` placeholder,
substituted by the installer when it publishes the file — exactly as
`platform.yml` already was. The `nextmavens` names belong to a different
domain and stay literal. (Before this, the file carried one host's hardcoded
names, so an install on any other domain published routes for names that were
not its own.)

## 4. The steps

| # | Step | Risk | State |
|---|------|------|-------|
| 1 | Add the application wildcards to DNS | none — additive | **done** |
| 2 | Write the static routes for the other products (`installer/config/traefik/products.yml`) | none — not deployed | **done** |
| 3 | Have the installer publish those routes and join the other stacks' networks | none — not deployed | **done** |
| 4 | Bring Traefik up on 8080/8443 and verify every route | none — the live edge is untouched | **done** |
| 5 | Stop Caddy, move Traefik to 80/443, verify every hostname | a few minutes of downtime | **done** — 2026-11-05 |
| 6 | Link the other products from the platform's dashboard | none | **done** — the Applications screen |
| 7 | Re-point `registry.` / `storage.` / `whatsapp.` on `nextmavens.com` at Traefik too | none | **done** — the routes exist; their certificates are waiting on Let's Encrypt |

## 4a. The cutover, as it actually happened (2026-11-05)

The platform was installed on this host for the first time: the repository
cloned to `/opt/fidscript-deploy`, the wizard run against the real
Cloudflare account (nine DNS records created), both images built from source,
and the core stack brought up.

**The edge moved.** Caddy was stopped and the platform's Traefik took 80 and
443. Everything that had been behind Caddy is now behind Traefik, on the
same hostnames, with the same upstreams:

| Hostname | Serves | After |
|---|---|---|
| `fidscript.com` | **the platform's dashboard** | 307 → `/projects` |
| `app.fidscript.com` | the dashboard, second name | 307 |
| `api.fidscript.com` | the API | 404 at the root (`/api/v1/…` serves) |
| `instant.fidscript.com` | the Instant console | 307 → `/dash` |
| `apiinstant.fidscript.com` | the Instant backend | 200 |
| `realtime.` / `cliinstant.` | the Instant backend | 200 |
| `instantmcp.fidscript.com` | the Instant MCP bridge | 405 — POST only, which is correct |
| `maven.fidscript.com` | the Maven repository | 404 — the artifact directory is empty |
| `whatsapp.fidscript.com` | the WhatsApp console | 200 |
| `whatsappapi.fidscript.com` | the WhatsApp API | 200 |
| `registry.fidscript.com` | the npm registry | 200 |
| `files.fidscript.com` | the artifact store | 502 — the host service is down |
| `storage.fidscript.com` | the MinIO console | 403 — unauthenticated, which is correct |
| `jmap.` / `stalwart-admin.fidscript.com` | the mail server | 302 |

The platform's own API answers healthy: the database, redis, nats and storage
all report up.

**The firewall moved too.** The rule that restricted the Instant MCP bridge to
Caddy's address now names the *edge* — Traefik — and resolves its address
from docker at apply time, so it survives either container being restarted
and a rollback to Caddy keeps working.

### Three things the cutover found that reading the code did not

1. **A router across two Cloudflare zones takes both names down.** A router
   serving `registry.fidscript.com || registry.nextmavens.com` asks for ONE
   certificate covering both. The token holds the fidscript.com zone, so the
   other zone's challenge could not be solved, the whole request failed, and
   the fidscript.com name lost its certificate too. Three routers were
   affected. Each name now has its own router.
2. **The platform advertised an API hostname it did not serve.**
   `api.{domain}` is what `PLATFORM_PUBLIC_URL`, the DNS record and the
   setup summary all name — and it had no router, so it had no certificate
   and the URL the operator was given did not work. It has one now.
3. **The API image only built when the workspace packages happened to be
   built.** Their `dist` is gitignored, so a fresh clone had no types for the
   api's compiler to resolve. The image built on a developer machine and
   failed on a clean one. The Dockerfile now builds the packages it compiles
   against.

### What the cutover could not settle

**Port 80 is not reachable from the internet on this host.** An external
fetch of `http://registry.nextmavens.com` times out. So an HTTP-01
challenge is impossible here — every certificate has to come from DNS-01,
which needs the token to hold the zone. The `nextmavens.com` zone is at
Cloudflare and the token holds it, but Let's Encrypt's per-identifier limit
(5 failed authorizations per hour) was reached during the first attempts, and
the three `nextmavens.com` names are waiting for the window to clear. Their
ROUTES are published and correct; their certificates are the only thing
missing, and the registry is reachable meanwhile at `registry.fidscript.com`.

## 5. Another live bug this surfaced

`Caddyfile` hardcodes the Docker bridge gateway as `172.19.0.1`. The
gateways have moved:

| Network | Gateway |
|---|---|
| `self-hosting_default` | `172.18.0.1` |
| `next-mavens-evolution-api_platform-net` | `172.20.0.1` |
| `nextmavens-registry_default` | `172.22.0.1` |

So every route that goes to a host service through `172.19.0.1` is broken
— which is why `storage.nextmavens.com` answers 502. The fix in the new
design is `host.docker.internal` (Docker's `host-gateway`), which is
correct whatever the bridge subnet happens to be.

Three of the four host services are also not running at all: only the
Instant MCP bridge (4876) is listening. The registry's admin-reset API
(4874), the registry MCP (4875) and the artifact store (4877) are down —
so `storage.nextmavens.com` and the registry's MCP endpoints are broken
today, independently of this consolidation.

## 6. The consolidated routes — tested, not assumed

The platform's Traefik was brought up on test ports (8080/8443) with
`installer/config/traefik/products.yml` loaded, leaving the live edge
untouched, and every hostname was requested through it:

| Hostname | Result | Reached |
|---|---|---|
| `instant.fidscript.com` | **307 → /dash** | the Instant console |
| `apiinstant.fidscript.com` | **200** | "Welcome to Instant's Backend!" |
| `realtime.fidscript.com` | **200** | the Instant backend |
| `whatsapp.fidscript.com` | **200** | the WhatsApp console |
| `registry.fidscript.com` | **200** | the npm registry |
| `maven.fidscript.com` | 404 | the Maven repository is up; its artifact directory is empty until CI publishes |
| `files.fidscript.com` | 502 | nothing is listening on the host's 4877 — the artifact store is down |
| `instantmcp.fidscript.com` | 502 | the MCP bridge listens on 4876, but an iptables rule allows only the Caddy container's IP — it has to be widened to Traefik's |
| `fidscript.com` | 502 | the platform's dashboard was not running in that test |

**Every route that has a live upstream works.** The three failures are not
routing problems: two are services that are not running, and one is the
MCP firewall rule, which is pinned to Caddy's address.

That last one is the only thing the cutover has to change beyond the
ports: the firewall rule that restricts the Instant MCP bridge to Caddy
has to allow Traefik's address instead.

## 7. What must not break

- The Instant console and API serve live clients — their hostnames,
  certificates and data must survive the cutover.
- The WhatsApp console serves live clients — same.
- The npm registry holds published packages (`@fidscript/*`, `@viventure/cli`,
  `@nextmavens/*`) — its storage is a bind-mounted directory and must not
  be recreated.
- The instant and whatsapp databases are volumes and must not be touched.

None of the cutover touches a volume or a data directory: it changes which
process holds 80/443 and where the routes point.
