# Package Conventions — package.json, tsconfig, and Workspace Rules

## Package Namespace
**All packages MUST use `@fidscript-deploy`.** The old `@fidscript/` namespace is
deprecated and was the source of real breakage during the Phase 5.5 stabilization.

## Correct package.json structure

### SDK (packages/sdk) — THE CANONICAL REFERENCE

```json
{
  "name": "@fidscript-deploy/sdk",
  "version": "1.0.0",
  "description": "Official FIDScript Deploy TypeScript SDK...",
  "type": "module",
  "main": "./dist/sdk/src/index.js",
  "types": "./dist/sdk/src/index.d.ts",
  "exports": {
    ".": "./dist/sdk/src/index.js",
    "./client": "./dist/sdk/src/client.js",
    "./modules/*": "./dist/sdk/src/modules/*.js"
  },
  "scripts": {
    "build": "tsc",
    "dev": "tsc --watch",
    "typecheck": "tsc --noEmit",
    "clean": "rm -rf dist"
  },
  "dependencies": {
    "@fidscript-deploy/events": "workspace:*",
    "@fidscript-deploy/types": "workspace:*",
    "axios": "^1.6.0",
    "socket.io-client": "^4.8.3"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "typescript": "^5.4.0"
  }
}
```

### tsconfig.json — critical rule

The root `tsconfig.base.json` has `"noEmit": true`. Any package that emits
(its `build` script runs tsc) MUST override this:

```json
// packages/types/tsconfig.json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src",
    "noEmit": false
  },
  "include": ["src/**/*"]
}
```

Without `noEmit: false`, tsc skips emission and the package produces no output.

### Common bugs to catch

**Bug 1: Wrong dist path in main/types**
```json
// WRONG — tsc outputs to dist/sdk/src/, not dist/
"main": "./dist/index.js"

// CORRECT
"main": "./dist/sdk/src/index.js"
```

**Bug 2: noEmit not overridden**
```json
// WRONG — base config has noEmit:true, package never emits
{ "compilerOptions": { "outDir": "./dist" } }

// CORRECT
{ "compilerOptions": { "outDir": "./dist", "noEmit": false } }
```

**Bug 3: exports missing subpaths**
```json
// WRONG — SDK submodules not exported
"exports": { ".": "./dist/sdk/src/index.js" }

// CORRECT — submodules accessible
"exports": {
  ".": "./dist/sdk/src/index.js",
  "./client": "./dist/sdk/src/client.js",
  "./modules/*": "./dist/sdk/src/modules/*.js"
}
```

## Workspace dependencies

Cross-package imports MUST use `workspace:*` protocol:
```json
"@fidscript-deploy/sdk": "workspace:*",
"@fidscript-deploy/events": "workspace:*",
```

NOT `file:../sdk` or `*://` or version numbers.

## Turbo build order

```json
// turbo.json
"build": { "dependsOn": ["^build"] }
```
`"^build"` means "wait for all upstream dependencies to build first." This ensures
packages are built in dependency order: types → events → sdk → api/dashboard/cli/mcp.

## DevDependency vs Dependency

- **Dev**: TypeScript, ESLint, Jest, ts-node, types
- **Runtime**: SDK, NestJS, Axios, etc.

SDK belongs in `dependencies`, NOT `devDependencies` — consumers need it at runtime.

## Package scripts convention

Every package should have:
```json
"scripts": {
  "build": "tsc",
  "dev": "tsc --watch",
  "typecheck": "tsc --noEmit",
  "clean": "rm -rf dist"
}
```

`typecheck` must ALWAYS be `tsc --noEmit` — not `tsc` (which emits).

## ESLint 9 flat config

Every package needs its own `eslint.config.mjs` (ESLint 9 flat config):
```javascript
import parser from "@typescript-eslint/parser";
import tseslint from "@typescript-eslint/eslint-plugin";

export default [
  {
    files: ["**/*.ts"],
    languageOptions: { parser },
    plugins: { "@typescript-eslint": tseslint },
    rules: { "no-unused-vars": "off", "no-undef": "off" },
  },
];
```

Dashboard uses FlatCompat to extend `next/core-web-vitals` and `next/typescript`.
