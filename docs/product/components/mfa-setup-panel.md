# Component Spec — `MFASetupPanel`

> QR + secret display for the Account → MFA setup. Used by `/account/mfa` (F02 §6).

## 1. Purpose
The user sets up TOTP MFA for their platform account. The principle: **the QR + secret
are the two channels — show both, let the user pick.**

## 2. Props
```ts
type MFASetupPanelProps = {
  /** The TOTP secret (generated server-side). */
  secret: string;
  /** The otpauth URL (for the QR code). */
  otpauthUrl: string;
  /** The verify callback. */
  onVerify: (code: string) => Promise<void>;
  /** The cancel callback. */
  onCancel: () => void;
};
```

## 3. Visual anatomy
```
┌────────────────────────────────────────────────────────────┐
│ Two-factor authentication                              [X] │
├────────────────────────────────────────────────────────────┤
│ 1. Scan this QR code with your authenticator app:          │
│   ┌────────────┐                                           │
│   │ ▓▓▓▓▓▓▓▓▓▓ │                                           │
│   │ ▓▓ QR  ▓▓▓ │                                           │
│   │ ▓▓▓▓▓▓▓▓▓▓ │                                           │
│   └────────────┘                                           │
│                                                            │
│ 2. Or enter the secret manually:                           │
│   JBSWY3DPEHPK3PXP                          [Copy]        │
│                                                            │
│ 3. Enter the 6-digit code from your app:                   │
│   ┌───┐ ┌───┐ ┌───┐ ┌───┐ ┌───┐ ┌───┐                      │
│   │ 4 │ │ 2 │ │   │ │   │ │   │ │   │                      │
│   └───┘ └───┘ └───┘ └───┘ └───┘ └───┘                      │
│                                                            │
│                                  [Cancel]  [ Verify ]      │
└────────────────────────────────────────────────────────────┘
```

## 4. States
- **Idle**: QR + secret + empty code input.
- **Verifying**: spinner on Verify.
- **Verified**: success toast; redirect to Account.
- **Error**: red border on the code input + error message.

## 5. Variants
- **Theme**: dark/light.

## 6. Interactions
- **Scan QR**: standard.
- **Copy secret**: copies to clipboard.
- **Type code**: auto-advances (uses `<MagicCodeInput>`).
- **Click Verify**: POSTs the code.

## 7. Accessibility
- **QR**: `alt="QR code for TOTP secret"` + the secret as fallback.
- **Copy**: `aria-label="Copy secret"`.
- **Code input**: standard `MagicCodeInput` a11y.

## 8. Telemetry / events
- `mfa_setup_panel.secret_copied` → `{ userId }`.
- `mfa_setup_panel.verified` → `{ userId }`.

## 9. Cross-references
- **Screens**: Account → MFA, F02 §6.

## 10. Acceptance criteria
- QR + secret are both shown.
- Copy secret works.
- Code input uses MagicCodeInput (auto-advances, pastes).
- Verify POSTs the code.
- Error state is clear.
- Theme-aware.