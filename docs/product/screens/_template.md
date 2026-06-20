# Screen Spec — `<Screen Name>`

> One of these per screen that needs more than the inventory row (non-obvious UX, multiple states, or
> novel patterns). Most screens can be specced inline in the inventory row (`index.md`); reach for
> this only when the screen earns it. The single-screen test in `user-experience-spec.md` §16 is the
> acceptance check.

## 1. Purpose
One line: what the user does here, and why.

## 2. Route + access
`/path/:param`, which sidebar/header entry, permission required, project scope.

## 3. Layout
ASCII or text sketch of the layout. Header / left rail / main / right rail / drawer.

## 4. Sections + states
For each section: idle, loading (skeleton), empty, error, success. Draw on the UX spec
(`user-experience-spec.md`) for the cross-cutting rules.

## 5. Primary + secondary actions
One primary (top-right), any secondary. Per UX §4.

## 6. API mapping
Inventory IDs (cross-ref `docs/phases/frontend/backend/`). Optimistic? Realtime event subscribed?

## 7. Forms + validation
Fields, constraints, validation messages, server-error mapping.

## 8. Accessibility
Focus order, keyboard, ARIA. Per UX §11.

## 9. Cross-references
Service spec, journey, navigation entry, related screens.

## 10. Acceptance criteria
The single-screen test applied here. What's the test that proves this screen works end-to-end?
