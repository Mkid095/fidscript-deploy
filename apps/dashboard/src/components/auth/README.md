# Auth Components

Authentication UI primitives used by the login, signup, and password reset flows. All components are client-only and have no business logic — they render state and emit events.

## Components

### `HealthBadge`
A small pill that shows a service health status with a coloured dot.

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `status` | `'idle' \| 'running' \| 'healthy' \| 'unhealthy' \| 'unknown'` | Yes | Current health state. |
| `label` | `string` | No | Override the default label text. |

**Usage:**
```tsx
<HealthBadge status="healthy" />
```

### `MagicCodeInput`
A 6-digit one-time-code entry box with auto-advance, backspace navigation, and paste support.

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `length` | `number` | No | Number of digits (default `6`). |
| `onComplete` | `(code: string) => void` | Yes | Fired when all digits are filled. |
| `disabled` | `boolean` | No | Disables input and dims boxes. |
| `error` | `boolean` | No | Applies shake animation + danger border. |

**Usage:**
```tsx
<MagicCodeInput onComplete={(code) => verify(code)} error={failed} />
```

### `PasswordInput`
Wraps the shared `Input` with a show/hide toggle for password fields.

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `label` | `string` | No | Field label. |
| `error` | `string` | No | Error text shown below. |
| `hint` | `string` | No | Helper text shown below. |
| `...rest` | `InputHTMLAttributes<HTMLInputElement>` | — | All native input props except `type`. |

**Usage:**
```tsx
<PasswordInput label="Password" hint="Min 8 characters" value={pw} onChange={...} />
```

### `PasswordStrength`
Three-bar strength meter (weak / fair / strong) computed from length + character class diversity.

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `password` | `string` | Yes | The current password value. |

**Usage:**
```tsx
<PasswordStrength password={pw} />
```

## Files
- `health-badge.tsx` — status pill
- `magic-code-input.tsx` — OTP code entry
- `password-input.tsx` — password field with toggle
- `password-strength.tsx` — strength meter