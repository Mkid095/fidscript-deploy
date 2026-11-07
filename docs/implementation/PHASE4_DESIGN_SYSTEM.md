# Phase 4 — the design system

> Phase 4 in full: what the foundations are, what they replaced, what they
> are used by, and what is still wrong.
>
> The objective was never a redesign. It was to give the dashboard a **floor**
> to stand on — one set of tokens, one set of shared components, one set of
> accessibility rules — and then to prove the floor holds by standing seven
> real screens on it.

---

## 1. What was there before

The audit of the dashboard's own code found the same six problems in every
screen:

| The problem | Where it showed |
|---|---|
| No focus ring you could see | the ring was the accent at 12% over the surface — about **1.1:1** — and `outline: none` had removed the browser's own |
| The shared `Modal` was not a dialog | no `role`, no name, no focus trap: the tab key walked out of the dialog into the page behind it, and the focus never came back |
| The shared `Button` had no `type` | a "Cancel" submitted the form it sat in |
| No shared `FormField` | 92 controls had no programmatic label; two fields with the same label shared one `id` |
| 16 dialogs hand-rolled their own overlay | each one with the same gaps as the shared `Modal` |
| 19 tables overflowed on a phone | they clipped |

And a specification that promised components which had never been built:
`DataTable`, `FilterBar`, `Breadcrumbs`, `EntityCard`, `KeyValueTable`.

---

## 2. The tokens

They live in `apps/dashboard/src/app/globals.css` — as CSS variables for the
two themes, mapped into Tailwind's `@theme` so the utilities (`bg-canvas`,
`text-accent`, `rounded-md`) and the components read from one place.

| Group | The tokens |
|---|---|
| **Radii** | `--radius-sm` 4px · `--radius-md` 6px · `--radius-lg` 10px · `--radius-xl` 14px · `--radius-full` |
| **Elevation** | `--elevation-sm` (a border's shadow) · `--elevation-md` (a menu) · `--elevation-lg` (a dialog) |
| **Depth** | `--z-base` 0 · `--z-sticky` 10 · `--z-dropdown` 20 · `--z-drawer` 30 · `--z-overlay` 40 · `--z-modal` 50 · `--z-toast` 60 |
| **Motion** | `--motion-fast` 120ms · `--motion-base` 200ms · `--motion-slow` 320ms · `--ease-out` |
| **Focus** | `--focus-ring` — the accent at 4px with a canvas-coloured gap · `--focus-ring-danger` |

The focus ring is the one that matters: it is the accent itself, set off from
the surface by the canvas. WCAG 2.2 SC 2.4.11 wants 3:1; this clears it.

`prefers-reduced-motion` turns every transition and animation down to
nothing, for the people who ask for that.

---

## 3. The components

Sixteen new components in `packages/ui`, the framework-agnostic layer. A
component renders and emits; it never fetches, never validates and never
knows about a project.

| Component | What it is for |
|---|---|
| `FormField` | a label, a control and a message, wired together |
| `Select` · `Textarea` · `Checkbox` · `Switch` | the controls a form is made of |
| `Table` (+ `THead` `TBody` `TR` `TH` `TD`) | a list of things — a real table, with a caption, that scrolls rather than clips |
| `Pagination` | the pages of a list |
| `Breadcrumb` | the way back — the current page marked `aria-current="page"` |
| `Tooltip` | a hint, announced with the control |
| `DropdownMenu` | a menu of actions — Escape, the arrows, click-away |
| `ErrorState` | it could not be done — `role="alert"`, with the way forward |
| `PageHeader` · `SectionHeader` | the top of a screen, the top of a section |
| `SearchField` | a search box, always named |
| `CodeBlock` | a piece of configuration, copyable |
| `IconButton` | an action that is only an icon — always named |
| `StatusDot` | a status, with its **name**, not only its colour |

And three corrected: the `Modal` (a real dialog now), the `Button` (`type`
defaults to `button`), the `Input` (`useId`, `aria-describedby`,
`aria-invalid`).

**No component was built to increase the count.** Each one exists because a
screen needed it and two screens needed the same thing.

---

## 4. The accessibility rules

They are requirements, not aspirations, and the tests hold the components to
them:

| Rule | What it means |
|---|---|
| Every control has a name | a label, an `aria-label`, or text |
| A label is connected to its control | `htmlFor` and an `id` that is unique on the page |
| A message is announced with its control | `aria-describedby`, and `aria-invalid` when it is an error |
| The focus ring is visible | `--focus-ring`, at least 3:1 against the surface |
| A dialog is a dialog | `role="dialog"`, `aria-modal`, a name, the focus inside it, and the focus back where it came from |
| The keyboard reaches everything | nothing is reachable only by mouse |
| The status is a word, not only a colour | a dot carries its name |
| The table is a table | `caption`, `scope="col"`, and it scrolls rather than clips |
| Motion is optional | `prefers-reduced-motion` is honoured |

---

## 5. The seven screens

Adoption was deliberately incremental: **presentation only** — no API call,
no permission rule, no change in what a screen does.

| Screen | What it uses now |
|---|---|
| Platform overview | `PageHeader`, `Button`, `ErrorState` |
| Projects list | `PageHeader`, `IconButton`, the shared `Input` |
| Project overview | `SectionHeader`, the shared `Card` |
| Database console | the shared `Select` (it had a hand-rolled one) |
| Functions console | `PageHeader`, and the violet tile replaced with the accent |
| Email console | `PageHeader`, `ErrorState` for a failed load |
| Settings | `PageHeader`, and a "This platform" card for the platform's own surfaces |

The functions console's violet tile is worth a sentence: **violet is not a
colour this product uses.** It is the AI-visual-vocabulary colour the
project's own rules forbid, and it was on the screen because a tile had been
picked rather than because it meant anything.

---

## 6. The visual check

TypeScript compiling is not the same as a screen being right, so the seven
screens were opened in a browser at **1440×900** and at **390×844** and
looked at. The screenshots are in
`docs/implementation/screenshots/phase4/` — fourteen of them, one pair per
screen.

Three things the compilation could not have caught:

| What the check found | The fix |
|---|---|
| The projects header read "**1 project** Deploy applications, databases…" — the count and the description ran into each other, because the separator the old header had was lost in the move to `PageHeader` | the separator is back |
| On a phone the header's actions ran off the right edge: the search field, the refresh button, "New deployment" and "New project" were one row that did not fit | the actions wrap, and the search field takes the whole width below `sm` |
| The platform's navigation was clipped mid-word on a phone, with nothing to say it could be scrolled | the nav scrolls horizontally, the wordmark gives up its space below `sm`, and the header's padding tightens |

---

## 7. The tests

| Suite | Result |
|---|---|
| `packages/ui` — vitest + @testing-library/react + jsdom | **38 tests in 3 files** |
| `apps/api` — jest | **126 tests in 20 suites** (115 before this phase, +11 for the GitHub connection) |
| `apps/api` — the integration tier (a real Nest app over HTTP, against a database of its own) | **29 tests in 8 files** |
| `apps/dashboard` — vitest | **37 tests in 7 files** |

The component tests check the thing that makes a component usable rather than
merely present: the label **names** the control, the message is announced
**with** the control, the dialog keeps the focus inside it and gives it back,
the table is a table, the error state is announced, the icon button has a
name.

---

## 8. What is not settled

Recorded, so that it is not rediscovered as a bug:

| The gap | Where it belongs |
|---|---|
| 92 controls have no programmatic label | the design system's `FormField` is the fix; the screens come later |
| 16 dialogs hand-roll their overlay | the shared `Modal` is the fix; the screens come later |
| 19 tables overflow on a phone | the shared `Table` is the fix; the screens come later |
| Hardcoded palette colours break the dark theme | the tokens are the fix; the screens come later |
| The specification promised components that were never built (`DataTable`, `FilterBar`, `Breadcrumbs`, `EntityCard`, `KeyValueTable`) | the shared `Table`, `SearchField`, `Breadcrumb` and `Card` are what exists; the rest is a later decision |
| The shared `Modal` had no dialog semantics or focus trap | **fixed** |
| The `Button` had no `type`, so a "Cancel" submitted the form | **fixed** |
| The focus ring was invisible | **fixed** |
| 84% of the product's "it worked" messages never rendered | **fixed** — the toast provider is mounted above every screen |

The contract is `docs/product/DESIGN_SYSTEM.md`.
