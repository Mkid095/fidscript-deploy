# Component: Button

The action primitive. Every screen's primary action + most secondary actions.

## 1. Purpose
Execute a single action with one click. The visual hierarchy carries the action's weight: primary >
secondary > destructive. Variants encode intent: copy-to-clipboard, icon-only, link-style.

## 2. Props
| Prop | Type | Default | Notes |
|---|---|---|---|
| `variant` | `'primary' \| 'secondary' \| 'destructive' \| 'ghost' \| 'icon' \| 'link'` | `'secondary'` | visual weight + chrome |
| `size` | `'sm' \| 'md' \| 'lg'` | `'md'` | height 28 / 36 / 44 |
| `children` | `ReactNode` | — | label (always required except `icon` variant — icon variant must set `aria-label`) |
| `leadingIcon` | `IconSvgElement` | — | Hugeicons (semantic only — UX §1) |
| `trailingIcon` | `IconSvgElement` | — | e.g. `ArrowRight02Icon` for "Continue" |
| `loading` | `boolean` | `false` | shows spinner, replaces icon, label becomes verb-ing |
| `disabled` | `boolean` | `false` | reason required (string) — surfaces in a tooltip |
| `disabledReason` | `string` | — | shown in `aria-describedby` + hover tooltip |
| `type` | `'button' \| 'submit' \| 'reset'` | `'button'` | — |
| `onClick` | `() => void \| Promise<void>` | — | resolves only on success; throws are caught → toast |
| `confirm` | `ConfirmOptions` | — | renders as `ConfirmDialog` first (see `confirm-dialog.md`) |
| `keyboard` | `string` | — | e.g. `⌘K` — rendered as a kbd after the label |
| `as` | `element` | `'button'` | `'a'` for external links (sets `rel`) |

## 3. Visual anatomy
```
[icon]  Label  [keyboard]  [icon]
```
The **icon + label** pairing is mandatory for `primary/secondary/destructive/ghost`. `icon` variant
has no label — `aria-label` is required.

## 4. States (full matrix)
| State | Visual | Behavior | Accessibility |
|---|---|---|---|
| Idle | variant chrome | hover lifts shadow, focus ring | focusable, `aria-label` if no children |
| Hover | bg −5% / shadow + | `cursor: pointer` | — |
| Focus-visible | 2px ring (fire-500) | — | always visible (a11y) |
| Active (pressed) | bg −10% / no shadow | — | — |
| Loading | spinner replaces icon, label becomes "Saving…", `disabled` | rejects clicks; awaits `onClick` | `aria-busy="true"` |
| Disabled (loading) | opacity 50% | rejects clicks | `aria-disabled` + `disabledReason` tooltip |
| Disabled (no perm) | opacity 50%, lock icon | rejects clicks | `aria-disabled` + `disabledReason` ("Requires admin") |
| Disabled (form invalid) | opacity 50% | rejects submit | `aria-disabled` + error under field |
| Error (action failed) | shake + red border 200ms | reverts to idle | `aria-live="polite"` toast |
| Success (e.g. copied) | check icon 1.5s, reverts | — | announces via live region |

## 5. Variants
- **primary** — filled fire-500, white text. The screen's one primary action.
- **secondary** — bordered slate-800, slate-200 text.
- **destructive** — filled red-600, used **only** for delete/rotate/drop.
- **ghost** — no chrome, hover bg slate-800/30.
- **icon** — 32px square, no label, `aria-label` required.
- **link** — underlined text, no chrome.

## 6. Interactions
Click + Enter + Space. Loading state rejects further clicks. If `onClick` throws, the button reverts
and an error toast surfaces.

## 7. Accessibility
Focus ring always visible (a11y, not just mouse). `aria-disabled` when disabled (never just `disabled`
attribute, so screen-readers still announce the reason). `aria-busy` during loading. Spinner has
`aria-hidden`; the loading label is the accessible name. **Never a button with no accessible name.**

## 8. Telemetry
Click → `*.action` event in the Activity feed (e.g. `projects.project.created` from a Create button).
Destructive clicks → `*.deleted` / `*.rotated` etc.

## 9. Cross-references
Used in: every screen that performs a mutation (Login, Register, New-deployment, New-function, etc.).
Per the UX spec (§4), **one primary per screen**, top-right.

## 10. Acceptance
Every variant renders in light + dark. Every state is reachable. Disabled reasons are real, not
generic. Loading state never spinners without a verb-ing label. Spinner is `aria-hidden`. No button
ships without an accessible name.
