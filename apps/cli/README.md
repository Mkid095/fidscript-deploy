# @fidscript-deploy/cli

The FIDScript command line — the platform and its npm registry, driven from
a terminal.

Published from this repository to the FIDScript registry.

## Install

```bash
npm install --registry=https://registry.fidscript.com -g @fidscript-deploy/cli
```

## Use

```bash
fidscript login <your API key>
fidscript projects list
fidscript deployments list
fidscript functions logs my-function
```

Every command takes `-o json` when a script is reading it.

## The registry

The CLI is the client for the FIDScript npm registry. It talks to the
registry directly over HTTP — it does not go through the MCP server.

```bash
fidscript registry login --token <your token>
fidscript registry whoami
fidscript registry list
fidscript registry versions @fidscript-deploy/sdk
fidscript registry search "@fidscript-deploy"
fidscript registry info @fidscript-deploy/cli
fidscript registry publish --tag latest
fidscript registry unpublish @fidscript-deploy/cli@1.1.3
fidscript registry guide npm
```

The token is read from `FIDScript_REGISTRY_TOKEN`, then `NPM_TOKEN`, then
`~/.fidscript/registry.json`, then the npm token in `~/.npmrc`. It is never
written into a project.
