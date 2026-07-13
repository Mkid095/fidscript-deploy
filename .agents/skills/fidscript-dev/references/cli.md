# CLI — apps/cli

## Source
`apps/cli/src/bin/fidscript.ts`

## Entry Point
`bin/fidscript.ts` — the CLI binary. Called as `fidscript <command>`.

## Key Pattern: Dynamic SDK Import
SDK is imported dynamically (not at top level) to avoid bundling issues:
```typescript
const { createFidscript } = await import('@fidscript-deploy/sdk');
```
This ensures the SDK is loaded at runtime with the correct `baseURL` from config,
not baked in at build time.

## Credential Storage
Credentials stored in `~/.fidscript/credentials.json`:
```json
{ "apiKey": "fids_..." }
```
File mode: `0o600` (owner read/write only).

Loaded via `loadCredentials()` from `../config/index`.

## Config
Config from `~/.fidscript/config.json` or `FIDScript_API_URL` env var.
No hardcoded API URL — always explicitly required.

```typescript
interface Config {
  apiUrl?: string;        // e.g. "https://deploy.fidscript.com"
  outputFormat?: 'table' | 'json' | 'raw';
  currentProject?: string;  // default project ID for --project flag
}
```

## Commands

| Command | Description |
|---------|-------------|
| `fidscript login <key>` | Store API key in `~/.fidscript/credentials.json` |
| `fidscript logout` | Clear stored credentials |
| `fidscript whoami` | Show current logged-in user |
| `fidscript projects create <name>` | Create a new project |
| `fidscript projects list` | List all projects |
| `fidscript deployments list` | List deployments for a project |
| `fidscript logs tail` | Tail live log stream |
| `fidscript init <template> <name>` | Scaffold from a template |
| `fidscript email send -t <to> -s <subject>` | Send a transactional email |
| `fidscript email send-template <id>` | Send a templated email |
| `fidscript email inbox` | List recent messages |
| `fidscript email status <id>` | Get delivery status |
| `fidscript email templates` | List email templates |
| `fidscript email domains` | List email domains |
| `fidscript email analytics` | Show delivery analytics |

## Error Handling
Uses `die(msg)` for fatal errors — prints to stderr and exits with code 1.
SDK errors caught and surfaced with `die()`.

## SDK Usage Pattern
```typescript
async function runCommand() {
  const cfg = loadConfig();
  if (!cfg.apiUrl) die('No API URL configured');
  const apiKey = getApiKey() ?? die('Not logged in');
  const { createFidscript } = await import('@fidscript-deploy/sdk');
  const sdk = createFidscript({ apiKey, baseURL: cfg.apiUrl });
  // use sdk...
}
```

## package.json
```json
{
  "name": "@fidscript/cli",
  "bin": {
    "fidscript": "./dist/bin/fidscript.js"
  }
}
```

Note: CLI uses `@fidscript/cli` name (not `@fidscript-deploy/cli`) — this is the
only package that does NOT use `@fidscript-deploy` namespace, as it is the
standalone CLI distributed as a binary.
