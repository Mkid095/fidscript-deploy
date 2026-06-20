# Component Spec — `<ComponentName>`

> One of these per reusable component (used in ≥ 2 screens or with non-trivial internal state). The
> single-screen test (UX spec §16) applied to the component. Every state is documented — not just
> "idle / loading / error" but the FULL state matrix.

## 1. Purpose
What it is and the value it provides. Which screens use it (cross-ref screen inventory).

## 2. Props (TypeScript-shape)
Every prop, required/optional, default, and a one-line description. Group: appearance, behavior, content.

## 3. Visual anatomy
ASCII/text sketch of the component's parts. Calls out which parts are required/optional.

## 4. States (the full matrix)
Every state the component can be in. For each: visual, behavior, accessibility.
- Idle (initial render)
- Hover / focus / active (interaction states)
- Loading (skeleton — never a spinner on a component that renders content)
- Empty (no data — friendly CTA, not "nothing here")
- Disabled (and **why** — "no permission" vs "loading" vs "form invalid")
- Error (inline message; never a blank failure)
- Success / confirmed (e.g. copied, deployed, rotated — show + auto-revert)
- Destructive confirmation (type-to-confirm variant)

## 5. Variants
Sizes, themes (light/dark), densities, contextual variants.

## 6. Interactions
Click / keyboard / swipe / drag. Keyboard shortcut if any (per UX §12).

## 7. Accessibility
ARIA roles, `aria-live` for async changes, focus management, keyboard parity, reduced motion.

## 8. Telemetry / events
What it emits (button-click → event type), for the Activity feed.

## 9. Cross-references
Which screens (inventory IDs), which services, which journey(s).

## 10. Acceptance criteria
State matrix covered. Reduced-motion honored. Keyboard works. Reduced states don't lie (no fake data).