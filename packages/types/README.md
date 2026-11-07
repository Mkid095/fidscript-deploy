# @fidscript-deploy/types

The shared TypeScript types for the FIDScript platform — the single source of
truth the SDK, the MCP server and the API are all written against.

Published from this repository to the FIDScript registry.

## Install

```bash
npm install --registry=https://registry.fidscript.com @fidscript-deploy/types
```

## Use

```ts
import type { EmailDomainCreated, PlatformEvent } from '@fidscript-deploy/types';
```

Two groups live here today:

- **Email** — the shapes the email platform serves: `EmailDomainCreated`
  (the domain, its ownership token and its DNS steps), `EmailMessage`,
  `EmailTemplate`, `EmailSuppression`, `EmailAnalytics`, `EmailWebhook`.
- **Events** — `PlatformEvent` and the event registry, so a consumer can
  type the events the platform emits.

If a type and the API disagree, the API is wrong: these are the shapes the
API serves.
