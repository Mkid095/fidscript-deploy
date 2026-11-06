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

Then:

```bash
npm install --registry=https://registry.fidscript.com @fidscript-deploy/sdk
npm install -g --registry=https://registry.fidscript.com @fidscript-deploy/cli
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

`fidscript registry logout` removes the stored one.

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

*Last updated: 2026-11-06 — the CLI registry command group; the packages
republished from this repository (`types` 1.0.2, `events` 1.0.3, `sdk` 1.0.5,
`cli` 1.1.4, `mcp-server` 1.0.8); the SDK's broken 1.0.0–1.0.3 withdrawn; the
published dependencies are ranges, not exact versions.*
