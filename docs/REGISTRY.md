# The FIDScript npm registry

> **Where the FIDScript packages live, how to install them, and how to
> publish a new version.**
>
> The registry is a [Verdaccio](https://verdaccio.org) instance at
> **https://registry.fidscript.com**. It is the platform's own registry — not
> npmjs.org — so a package can be installed by name without anybody having to
> publish to the public registry.

---

## 1. What is in it

| Package | What it is |
|---|---|
| `@fidscript-deploy/types` | the shared TypeScript types — the shapes the API serves |
| `@fidscript-deploy/events` | the event types the platform emits |
| `@fidscript-deploy/sdk` | the typed client for the whole platform |
| `@fidscript-deploy/cli` | the `fidscript` command line |
| `@fidscript-deploy/mcp-server` | the platform as Model Context Protocol tools |
| `@fidscript/instant-*` | the InstantDB side (published from the Instant repository) |
| `@nextmavens/*`, `@soostori/*` | private business packages |

`@fidscript-deploy/ui` is **not** published: it is the dashboard's own design
system, and it is tied to the application.

---

## 2. Installing from it

The private scopes need a token. The token lives in `~/.npmrc` on the
machine, or in the CI secret `NPM_TOKEN` — **never in the repository**.

```bash
# ~/.npmrc
@fidscript-deploy:registry=https://registry.fidscript.com
//registry.fidscript.com/:_authToken=${NPM_TOKEN}
```

**On a fresh machine** the first install has to name the registry, because
npm does not yet know it:

```bash
npm install -g @fidscript-deploy/cli --registry=https://registry.fidscript.com
fidscript login      # mints the account token and links the registry
```

From then on npm itself is pointed at the registry: `fidscript login` and
`fidscript registry link` write the two scope lines and the auth token into
`~/.npmrc` (only the lines they own; everything else in the file is kept),
so a plain `npm install @fidscript-deploy/…` — with no `--registry` flag —
resolves from **this** registry, not from npmjs. Unlinking removes the now
dead token line and keeps the scope routing (public packages install
without a token).

```bash
npm install @fidscript-deploy/sdk            # now routes here, no flag needed
npm install -g @fidscript-deploy/cli
```

The repository's own `.npmrc` carries the scope mapping but **no token** —
every dependency inside this repository is a workspace link, so the mapping
only matters for consumers and for publishing.

---

## 3. The command line

The CLI is the registry's client. It speaks the registry's HTTP directly —
it does not go through the MCP server. A person at a terminal should not have
to speak MCP to a registry.

```bash
fidscript registry login --token <your token>   # stores it in ~/.fidscript/registry.json (0600)
fidscript registry whoami                        # which account the token belongs to
fidscript registry list                          # the packages your account owns
fidscript registry versions <package>            # the published versions
fidscript registry search "<query>"              # search the registry
fidscript registry info <package>                # tags, versions, description
fidscript registry publish --tag latest          # publish the package in this directory
fidscript registry unpublish <package>@<version> # take one version down
fidscript registry remove <package>              # take the whole package down
fidscript registry guide npm                     # how to install and publish, per tool
```

### Where the token comes from

Read in this order, and never written into a project:

1. `FIDScript_REGISTRY_TOKEN` — the environment (what CI uses)
2. `NPM_TOKEN` — the environment (what npm itself reads)
3. `~/.fidscript/registry.json` — written by `fidscript registry login`
4. `~/.npmrc` — the token npm already has, if it is for this registry

`fidscript registry logout` removes the stored one. The same lines in
`~/.npmrc` are written by `fidscript login` and `fidscript registry link`
(scope routing + the minted token) and cleaned up by `fidscript registry
unlink` (the token line; the routing stays) — see §2.

### Why publishing goes through npm

`fidscript registry publish` drives `npm publish` with a temporary npmrc, so
the tarball is built, hashed and uploaded by npm rather than by a
re-implementation of it here. The token reaches npm through `NODE_AUTH_TOKEN`
— the npmrc holds the placeholder `${NODE_AUTH_TOKEN}`, so the token itself
never touches the disk and never lands in a shell history.

---

## 4. Publishing a new version

The packages are published from this repository, in dependency order:

```bash
# 1. build
npx turbo build --concurrency=1 \
  --filter=@fidscript-deploy/types \
  --filter=@fidscript-deploy/events \
  --filter=@fidscript-deploy/sdk \
  --filter=@fidscript-deploy/cli \
  --filter=@fidscript-deploy/mcp-server

# 2. bump the version in the package.json of each package that changed
#    (the workspace:* dependencies are rewritten to the real version on publish)

# 3. publish, in order
cd packages/types     && pnpm publish --no-git-checks
cd packages/events    && pnpm publish --no-git-checks
cd packages/sdk       && pnpm publish --no-git-checks
cd apps/cli           && pnpm publish --no-git-checks
cd apps/mcp-server    && pnpm publish --no-git-checks
```

`pnpm publish` is used rather than `npm publish` because it rewrites the
`workspace:` dependencies into real version ranges — npm does not understand
the `workspace:` protocol and refuses to publish it.

**The published dependencies are ranges, not exact versions.** `workspace:*`
is published as the exact version, so withdrawing a patch would break every
package that depended on it — which is exactly what happened when the SDK's
1.0.3 was withdrawn and the CLI could no longer be installed. The published
packages therefore use `workspace:^`, which is published as `^version`.

### The ESM rule

Every published package is ESM (`"type": "module"`), so Node needs the `.js`
extension on every relative import. `tsc` does not write them, so the build
runs `scripts/fix-extensions.mjs` afterwards. **A package published without
that step cannot be imported by Node** — this is why the SDK's versions
1.0.0–1.0.3 were withdrawn.

---

## 5. The registry itself

| | |
|---|---|
| **Host** | `registry.fidscript.com` (Verdaccio 6.10.5, bound to `127.0.0.1:4873`, served over HTTPS by the edge) |
| **Config** | `/opt/nextmavens-registry/conf/config.yaml` |
| **Storage** | `/opt/nextmavens-registry/storage` (the htpasswd file and the packages) |
| **Proxy** | anything not published here falls through to npmjs.org |

### The scopes

| Scope | Read | Publish | Proxied to npmjs |
|---|---|---|---|
| `@fidscript-deploy/*` | anyone | authenticated | no |
| `@fidscript/*` | anyone | authenticated | no |
| `@nextmavens/*` | authenticated | authenticated | no |
| `@soostori/*` | authenticated | authenticated | no |
| `**` (everything else) | anyone | authenticated | yes |

The private scopes are **local-only** on purpose: a package published here
must never leak through the proxy to the public registry.

---

## 6. What is not here yet

- **No web UI for the registry.** The Verdaccio console is reachable, but
  the CLI is the supported path.
- **`@fidscript-deploy/ui` is not published.** It is the dashboard's own
  design system; publishing it is a decision nobody has made yet.
- **The registry's MCP server still points at the old host.**
  `/opt/nextmavens-registry/mcp/server-http.js` defaults to
  `registry.nextmavens.com`. It serves the `@fidscript/instant-mcp` package
  and is **not** the path this repository publishes through — the CLI is.

---

## 7. The platform's link into the registry

One platform login reaches the registry too: the platform mints the user's
registry account (a password it generates and keeps encrypted) and hands
the user's machine the registry **token**. The two credentials are
independent — the platform token (`fsk_…`) and the registry token are
different secrets with different lifecycles, and revoking one never
invalidates the other.

### The provider seam

The API never speaks Verdaccio directly. It speaks a `RegistryProvider`
interface (`apps/api/src/modules/applications/services/registry-provider/`),
and the platform's one concrete provider today is
`VerdaccioRegistryProvider`. The seam exposes the capabilities a registry
backend can have:

| Capability | What it is | Verdaccio today |
|---|---|---|
| `provision(name, password, login)` | create a user, or sign one in and mint a token | the npm couchdb user endpoint, **PUT** only |
| `revoke(name)` | make the user — and every token minted for it — stop working | deleting the user's entry in the user database (htpasswd), when the platform may edit it (`REGISTRY_USERDB_FILE`); otherwise `user-side-only` |
| `revocation` | whether the platform can drive revocation | `supported` with the user database mounted; `user-side-only` without it |
| `address()` | the registry's public address | `https://registry.fidscript.com` |

Publishing and installing are **not** on the seam: they run from the user's
machine straight to the registry over the npm protocol, with the token the
provider minted. A different registry backend is one new provider
implementation; nothing above the seam changes.

### The credential lifecycle, exactly

| Event | What happens | Tokens afterwards |
|---|---|---|
| **First link** (`fidscript login` / `registry link` / dashboard "Link registry") | the platform generates a registry password, creates the user via `PUT /-/user/org.couchdb.user:<name>`, stores the password encrypted (`user_registry_credentials`), returns the minted token | one live token, kept on the user's machine |
| **Re-link** (any time) | signs the existing user in with the stored password (Basic-authenticated `PUT`) and mints a **fresh** token; the old one stays valid | two live tokens |
| **Unlink** (`fidscript registry unlink` / dashboard "Unlink") | the registry user's htpasswd entry is deleted (when revocation is `supported`) and the platform forgets the password; the user's own published packages are unaffected | **every token minted for that user stops authenticating** |
| **Unlink, revocation `user-side-only`** | the platform forgets the password and says so; the registry account and its tokens remain active until the registry admin deletes the user | tokens still live — and the answer says that |
| **Unlink, registry refuses** | the link stays in place; the error names the refusal | unchanged |
| **Platform account deleted** | the credential row cascades with the user; a deletion flow must call `registryAccount.revoke(userId)` first, which kills the registry user the same way unlink does | every token for the dead account stops working |
| **Platform account disabled** | nothing in the registry knows about the platform's account state: the registry credentials keep working until explicitly unlinked or revoked | unchanged — by design, the identities are separate |
| **Username collision** | `user@domain` maps to `user.domain` (the `@` is not a legal npm username). The mapping is not injective — `a@b.co.uk` and `a.b@co.uk` both land on `a.b.co.uk` — so one registry user belongs to exactly one platform account (a unique index on `registry_user`), and a second account claiming a taken name is told, not silently queued | — |

Two wire facts the lifecycle leans on, verified against the running
registry (Verdaccio 6.10.5, htpasswd): the user endpoint answers only to
**PUT** (POST/DELETE 404), and there is **no** password rotation on the
wire (a `PUT` with changed credentials is rejected 401; the token page's
reset endpoint does not exist). Revocation is therefore user deletion, not
secret rotation.

### A known soft spot, owned by the registry operator

`GET /-/whoami` on this registry answers **200 to anonymous callers**
(legacy security mode), so it cannot be used to prove a token is valid —
validity is proven on a scope the registry gates (`@nextmavens/*` answers
401 anonymous, 404 with a good token). The token page's **reset** flow is
also dead (its `/-/admin/reset` endpoint 404s). Both are the registry
operator's configuration, and both are recommendations rather than
changes: tighten `security.api.legacy` and wire the reset endpoint, or
accept that token-page users can only get fresh tokens by signing in.

---

*Last updated: 2026-11-26 — section 7: the provider seam and the credential
lifecycle (link, re-link, unlink-revocation, account deletion, collision
handling); registry usernames are emails with `@` read as `.`; revocation
works by deleting the htpasswd entry when `REGISTRY_USERDB_FILE` is
mounted.*
