# @fidscript-deploy/sdk

The typed client for the FIDScript Deploy platform — one SDK for projects,
deployments, functions, databases, storage, queues, the scheduler, email,
domains, monitoring, logs and the platform overview.

Published from this repository to the FIDScript registry.

## Install

```bash
npm install --registry=https://registry.fidscript.com @fidscript-deploy/sdk
```

The registry needs a token for installs of the private scopes:

```bash
npm config set //registry.fidscript.com/:_authToken <your token>
```

## Use

`baseURL` is required. There is no default host — every consumer points at
their own deployment, so a token can never leak to the wrong instance.

```ts
import { createFidscript } from '@fidscript-deploy/sdk';

const fs = createFidscript({
  baseURL: 'https://api.fidscript.com',
  apiKey: process.env.FIDSCRIPT_API_KEY,
});

const projects = await fs.projects.list();
const overview = await fs.overview.get();
```

## The command line

The same operations are available from the terminal, and the registry itself
is driven by the CLI:

```bash
npx --registry=https://registry.fidscript.com @fidscript-deploy/cli registry whoami
```

See `@fidscript-deploy/cli` for the full command list.
