# @fidscript-deploy/events

The event types the FIDScript platform emits — one union, one naming scheme,
so a consumer can type what it listens for.

Published from this repository to the FIDScript registry.

## Install

```bash
npm install --registry=https://registry.fidscript.com @fidscript-deploy/events
```

## Use

```ts
import type { EventType } from '@fidscript-deploy/events';

const WATCHED: EventType[] = [
  'deployment.started',
  'deployment.failed',
  'identity.user.registered',
];
```

The naming scheme is `<domain>.<entity>.<verb>`: `identity.user.logged_in`,
`deployment.succeeded`, `email.message.sent`. Every string the platform
emits is a member of this union — the type is the gate, so an event that
does not exist cannot be emitted without a typecheck failure.
