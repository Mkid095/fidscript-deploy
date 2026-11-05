# FIDScript add-ons

An **add-on** is an optional component the operator can install onto a VPS
alongside the core platform. The core stack (`installer/docker/docker-compose.yml`)
is the platform itself — Postgres, Redis, NATS, object storage, mail, Traefik,
the API and the dashboard. Everything else is an add-on.

## Why they exist

The platform must install on a machine that may only want the platform. A
customer who wants Prometheus, or an InstantDB-compatible realtime backend,
or the WhatsApp platform, should not have those services started — or their
images pulled — on every install. And the operator must be able to add one
later without reinstalling.

## The contract

```
installer/addons/<id>/
├── addon.yml                    # the manifest (required)
├── docker-compose.addon.yml     # the compose fragment (required)
├── <config files>               # anything the fragment mounts
└── secrets.env.example          # optional: non-secret config template
```

### `addon.yml`

```yaml
id: observability                      # must match the directory name
title: Observability stack             # shown in the wizard and the CLI
summary: Prometheus, Grafana and Loki for the platform and its apps.
requires: []                           # add-on ids that must be enabled first
conflicts: []                          # add-on ids that cannot be enabled together
host_ports:                            # ports this add-on wants on the host
  - 9090                               # prometheus
  - 3000                               # grafana
secrets:                               # secrets the add-on needs; generated on enable
  grafana_password: 32                 # hex bytes of entropy
```

`id`, `title` and `summary` are required. Everything else is optional.

### `docker-compose.addon.yml`

A standard Compose fragment. It is **merged** with the core file — it is not a
standalone stack. Two rules follow from how Compose merges files:

- **Relative paths resolve against the core compose file's directory**
  (`installer/docker/`), not against the add-on's own directory. So a config
  file that lives next to the fragment is mounted as
  `../addons/<id>/prometheus/prometheus.yml`, and a secret is
  `./secrets/<id>_<name>.txt`.
- **Top-level maps merge.** The fragment can add `services:`, `volumes:`,
  `networks:` and `secrets:` entries; entries with a name that already exists
  in the core file are overridden, and new ones are added.

Networks the add-on needs from the core stack (e.g. `fidscript-deployment`) are
already declared by the core file, so the fragment can just reference them.

### Secrets

Secrets declared in `addon.yml` are generated when the add-on is enabled and
written to `installer/docker/secrets/<id>_<name>.txt` (mode 600). The fragment
then declares them in its own `secrets:` block and mounts them per service,
exactly like the core stack does.

## Using them

```bash
fidscript-addons list                 # what's available
fidscript-addons enable observability # install one
fidscript-addons disable observability
fidscript-addons status               # enabled + container state
```

The setup wizard also offers them as an optional step, and `install.sh`
installs the ones selected there.

## Available add-ons

| id | What it adds |
|----|--------------|
| `observability` | Prometheus, Grafana, Loki, Promtail and cAdvisor |
| `instant` | The complete Instant BaaS — realtime Postgres, the Instant server, the web console, a Maven repository for the Kotlin/Android SDK, and object storage |
| `whatsapp` | The WhatsApp Business platform — the Evolution API for channels, its own database and cache, and the web console |
| `app-runtime` | A local image registry, so built application images are stored durably and can be pulled by any node |
| `package-manager` | A private npm registry and a Maven repository, so SDKs and internal packages have a home that does not depend on a public registry |

### `package-manager` — attaching to a registry that already exists

The npm registry keeps its packages in a storage directory, and the
Maven repository keeps its artifacts in another. Both are **configurable**,
so the add-on can be pointed at directories that are already in use:

```
# in installer/docker/.env
PACKAGE_MANAGER_REGISTRY_STORAGE=/opt/nextmavens-registry/storage
PACKAGE_MANAGER_REGISTRY_PLUGINS=/opt/nextmavens-registry/plugins
PACKAGE_MANAGER_MAVEN_STORAGE=/var/maven-repository
```

The add-on never re-owns the packages it finds there — it only writes the
`htpasswd` file (and only when there is not one already) and the plugins
directory, so an existing registry's packages and users are left alone.

The registry is bound to the platform network only. Publish it to the
host with `PACKAGE_MANAGER_REGISTRY_PORT` if a build agent outside
Docker has to reach it.

### `instant` — a full BaaS, not just a database

The `instant` add-on provisions the same shape as the upstream Instant
self-hosting stack:

| Service | Image | What it is |
|---------|-------|-----------|
| `instant-postgres` | `ghcr.io/instantdb/postgresql:postgresql-17-pg-hint-plan` | The database, with logical replication — Instant's change streams are built on it |
| `instant-server` | `ghcr.io/instantdb/server:latest` | The Instant backend: the query layer and the realtime websocket API |
| `instant-console` | `ghcr.io/instantdb/dashboard:latest` | The web console — the dashboard an operator opens in a browser |
| `instant-maven` | `caddy:2-alpine` | Serves the Kotlin/Android SDK artifacts, which is how a Kotlin app depends on Instant |
| `instant-storage` | `rustfs/rustfs:1.0.4` | S3-compatible storage for app backups |
| `instant-init` | `amazon/aws-cli:latest` | Creates the storage buckets, then exits |

The console and the server are the **published** upstream images, so the
add-on installs without building anything. A locally built console (from
the Instant repository's `self-hosting/Dockerfile.www`) can be used
instead with `INSTANT_CONSOLE_IMAGE`.

Two things are **public hostnames** and cannot be generated — set them in
`installer/docker/.env` before the console is useful:

```
INSTANT_API_HOST=https://api.<your-domain>
INSTANT_DASH_HOST=https://<your-domain>
INSTANT_MAVEN_HOST=https://<your-domain>/maven
```

The console resolves the backend from the browser, so these have to be the
addresses a client can reach — the in-network container names will not
work outside Docker.

**Authentication.** Instant has no API key. A client identifies itself
with an *app id* (public), and access is governed by the app's
permission rules. The console signs users in with a magic code, and
server-side tooling (the CLI, the MCP) authenticates with a **Personal
Access Token** (`per_…`), issued from the console under User Settings →
Personal Access Tokens. The platform admin account is created from
`INSTANT_SUPERUSER_EMAIL`.
