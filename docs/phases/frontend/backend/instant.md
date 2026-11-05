# Backend Inventory — Instant (the project's data plane)

See `index.md` for conventions. All routes JWT + project-access (owner/member) unless noted.

The Instant BaaS is where an application's **data, users, permissions and
files** live. The platform owns where the app runs; Instant owns what it
stores. The decision is in `docs/CAPABILITY_OVERLAP.md`.

## Instant app — `/api/v1/projects/:projectId/instant`

| ID | Method | Path | Request | Response | Events |
|----|--------|------|---------|----------|--------|
| INST-01 | GET | `/instant` | — | `{available:boolean, dashboardUrl:string, app:null\|{appId,title,status,createdAt}}` | none |
| INST-02 | POST | `/instant` | {title?} (defaults to the project's name) | `{appId,title,status,createdAt}` | `instant.app.provisioned` |
| INST-03 | DELETE | `/instant` | — | `{deleted:true}` | `instant.app.deleted` |
| INST-04 | GET | `/instant/config` | — | `{apiHost,dashboardUrl,appId}` | none |

**`available`** is `false` when the platform holds no Instant superuser token.
`POST` then answers **503** rather than creating anything. The token is
optional on purpose: a platform-only install is unaffected, and the wizard
collects the token after the stack is up.

**`INST-03` deletes the Instant app and everything in it** — a soft delete on
Instant's side, but from the operator's point of view the app is gone. It is
not reversible.

**`INST-04` deliberately omits the admin token.** That token is the platform's
credential, not the application's: an application authenticates with its own
user token, and Instant evaluates its permission rules before sending
anything. A deployed application reads `INST-04` for the host and the app id,
and subscribes to the app itself.

## What the platform does NOT expose

The app-facing query, realtime, permission and file APIs are **Instant's own
SDK**, not the platform's. There is no `INST-*` endpoint that proxies a query
or a subscription — the platform hands the application its app id and gets out
of the way. See `docs/product/services/` for the split.
