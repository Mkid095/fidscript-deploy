# Component Spec — `PasswordStrength`

> The strength meter for password fields. Used by Register, Force-change-password,
> New-mailbox.

## 1. Purpose
The user picks a strong password. The principle: **strength is a story, not a score.**

## 2. Props
```ts
type PasswordStrengthProps = {
  /** The current value. */
  value: string;
  /** Show the strength meter (default true). */
  showMeter?: boolean;
  /** Show the rules (default true). */
  showRules?: boolean;
};
```

## 3. Visual anatomy
```
Password *
┌─────────────────────────────────────────────────────────────┐
│ ••••••••••••                                                │
└─────────────────────────────────────────────────────────────┘
Strength: ████░░░░░░  Strong
✓ At least 12 characters
✓ Uppercase + lowercase
✓ Number
✗ Special character
```

## 4. States
- **Empty**: no meter; rules are greyed.
- **Weak**: red meter; rules list what's missing.
- **Fair**: yellow meter.
- **Strong**: green meter; all rules met.
- **Compromised** (P1 follow-up): if the value appears in the HIBP breach list, an
  additional warning.

## 5. Variants
- **Density**: compact (default); comfortable.

## 6. Interactions
- **Type**: meter updates live.
- **Hover rule**: tooltip with the rationale.

## 7. Accessibility
- **Meter**: `role="meter"` with `aria-valuemin/max/now` and `aria-label="Password strength: <level>"`.
- **Rules**: `<ul>` with each rule as `<li>`; `aria-checked` indicates met/unmet.

## 8. Telemetry / events
- (none — the strength is computed client-side).

## 9. Cross-references
- **Screens**: Register, Force-change-password, New-mailbox.

## 10. Acceptance criteria
- Meter updates as the user types.
- Rules list shows what's met / unmet.
- Screen-reader announcements are correct.
- Theme-aware.