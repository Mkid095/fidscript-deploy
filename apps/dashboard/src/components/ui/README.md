# UI Components

Local UI primitives that aren't exported by `@fidscript/ui`. Anything reusable across apps belongs in `packages/ui` instead.

## Files

| File | Purpose |
|------|---------|
| `loading-screen.tsx` | Full-page skeleton shown during cold loads / route transitions. |

## Conventions
- One component per file.
- No business logic, no SDK calls — pure rendering + event emission.