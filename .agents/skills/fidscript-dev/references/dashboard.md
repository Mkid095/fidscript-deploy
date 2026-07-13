# Dashboard — Next.js 15 Patterns

## Source
`apps/dashboard/`

## SDK Initialization (`src/lib/sdk.ts`)

```typescript
import { createFidscript } from '@fidscript-deploy/sdk';
import { createMockSdk } from '@/mocks/sdk';

const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK_API === 'true';
const RAW_URL = process.env.NEXT_PUBLIC_API_URL;

// Strip trailing /api since SDK prepends /api/v1
export const API_BASE_URL = RAW_URL?.replace(/\/api$/, '') ?? '';

export function makeSdk(apiKey?: string): FidscriptSDK {
  if (USE_MOCK) return createMockSdk();
  if (!API_BASE_URL) throw new Error('NEXT_PUBLIC_API_URL not set');
  return createFidscript({
    baseURL: API_BASE_URL,
    apiKey,
    onUnauthorized: refreshAccessToken,   // transparent 401 refresh
  });
}
```

## Token Refresh
Stored in localStorage:
- `fidscript_access_token` — current JWT access token
- `fidscript_refresh_token` — refresh token
- `fidscript_token` — legacy key (still read for backwards compat)

Refresh flow (in `src/lib/sdk.ts`):
1. SDK interceptor catches 401
2. `onUnauthorized()` called — reads `refresh_token` from localStorage
3. POST to `/api/v1/auth/refresh` with `{ refreshToken }`
4. New tokens stored in localStorage
5. Original request retried with new access token

## Mock Mode
`NEXT_PUBLIC_USE_MOCK_API=true` activates `createMockSdk()` from `src/mocks/sdk.ts`.
Mock returns fake data without HTTP requests — useful for UI development.

## Environment Variables
- `NEXT_PUBLIC_API_URL` — API base URL (e.g. `https://deploy.fidscript.com/api`)
- `NEXT_PUBLIC_USE_MOCK_API` — use mock SDK (default: false)
- `NEXT_PUBLIC_APP_URL` — dashboard URL (for OAuth redirects)

## Build Args (Docker)
```dockerfile
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
```

## ESLint Config
`apps/dashboard/eslint.config.mjs` — ESLint 9 flat config with FlatCompat:
```javascript
import { FlatCompat } from "@eslint/eslintrc";
const compat = new FlatCompat({ baseDirectory: __dirname });

export default [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  { rules: { /* pre-existing violations suppressed */ } }
];
```

### Suppressed Rules (pre-existing, DO NOT re-enable without team sign-off)
- `import/order`
- `@typescript-eslint/no-unused-vars`
- `no-unused-vars`
- `prefer-const`
- `@typescript-eslint/no-explicit-any`
- `@typescript-eslint/no-unsafe-function-type`
- `@typescript-eslint/no-unused-expressions`
- `@next/next/no-html-link-for-pages`
- `react/no-unescaped-entities`
- `react-hooks/exhaustive-deps`
- `reportUnusedDisableDirectives`

There are 40+ files with violations. Re-enabling these rules would cause a massive
lint failure across the dashboard.

## Next.js Config (`next.config.mjs`)
```javascript
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',       // Docker-friendly standalone output
  outputFileTracingRoot: path.resolve(__dirname, '../..'),
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'res.cloudinary.com', pathname: '/dfp7uhzy3/image/upload/**' },
      { protocol: 'https', hostname: '*.fidscript.dev' },
      { protocol: 'https', hostname: '*.s3.amazonaws.com' },
    ],
  },
};
```

## Key File Locations
- SDK initialization: `src/lib/sdk.ts`
- Mock SDK: `src/mocks/sdk.ts`
- Auth context: `src/contexts/auth-context.tsx`
- Webhooks page: `src/app/(app)/email/webhooks/page.tsx`
