---
name: fidscript-domains
description: Add and verify a custom domain with automatic TLS on FIDScript. Includes DNS record provisioning, CNAME setup, and certificate issuance.
allowed-tools:
  - list_projects
  - get_project
version: "1.0.0"
platform-version: ">=1.0.0"
---

# FIDScript Domains Skill

Use this skill to attach a custom domain to a FIDScript deployment with automatic TLS.

## Prerequisites

- A registered domain name you control
- Access to the domain's DNS settings
- A deployed project on FIDScript

## Step 1 — Identify your project and deployment

```
Use list_projects with: {}

Use list_deployments with:
  projectId: <projectId>
```

Note the deployment URL (e.g., `demo.fidscript.com`).

## Step 2 — Add the domain (Dashboard or CLI)

```
fidscript domains add --project <projectId> --domain yourdomain.com
```

Or via the Dashboard at `/domains`.

## Step 3 — Configure DNS

FIDScript will show the DNS records to add. Set these in your DNS provider:

| Type | Name | Value | Purpose |
|------|------|-------|---------|
| CNAME | www | `<deployment-url>` | WWW subdomain |
| CNAME | @ | `<deployment-url>` | Root domain |
| TXT | _acme-challenge | `<challenge-token>` | Domain verification |

Propagation typically takes 5 minutes to 48 hours.

## Step 4 — Verify and issue TLS

```
fidscript domains verify --project <projectId> --domain yourdomain.com
```

Or check status in the Dashboard at `/domains`.

Once verified, TLS certificates are issued automatically via Let's Encrypt.

## Step 5 — Deploy with custom domain

The deployment is now accessible at `https://yourdomain.com`.
