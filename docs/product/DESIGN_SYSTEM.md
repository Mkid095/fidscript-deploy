# The FIDScript design system

> The foundations the dashboard is built on: the tokens, the shared
> components, the accessibility rules they hold to, and how a new screen is
> supposed to use them.
>
> This is not a redesign. It is the floor the existing screens stand on.

---

## 1. The principles

1. **It is an operator's console, not a marketing page.** Dense, calm and
   legible. The information is the design.
2. **One thing is true at a time.** A screen says what it is, what it holds
   and what to do next — and it says the same thing everywhere.
3. **The state is part of the screen.** Loading, empty, error and permission
   are designed, not accidents. A screen that failed says so, in place, and
   says what to do.
4. **Colour carries meaning, never decoration.** A colour is a token, and a
   token has one job. Violet is not a colour this product uses: it is the
   AI-visual-vocabulary colour the project's own rules forbid.
5. **The keyboard is a first-class way in.** Every interactive control has a
   visible focus ring, a name, and the semantics its role implies.
6. **Honesty beats polish.** A number that is not measured is not shown. A
   capability that does not exist is greyed out and named as missing, never
   faked.

---

## 2. The tokens

The tokens live in `apps/dashboard/src/app/globals.css` — as CSS variables
for the two themes, and mapped into Tailwind's `@theme` so the utilities
(`bg-canvas`, `text-accent`, `rounded-md`) and the components read from one
place.

### The themes

| Token | Dark (default) | Light | What it is |
|---|---|---|---|
| `--canvas` | `#000000` | `#f5f6f8` | the page behind everything |
| `--surface` | `#0b0e14` | `#ffffff` | a panel |
| `--surface-2` | `#111419` | `#eef0f3` | a control, an inset |
| `--surface-3` | `#161a20` | `#e3e6eb` | a raised control, a tooltip |
| `--rail` | `#1e2228` | `#d9dce0` | a border |
| `--rail-light` | `#2a2e35` | `#c8cbd1` | a border that is meant to be seen |
| `--text` | `#f0f0f0` | `#1a1a1a` | the words |
| `--text-muted` | `#a1a4a5` | `#55575c` | supporting words |
| `--text-dim` | `#6c6f76` | `#6e7178` | a hint, a count |

### The semantic colours

| Token | Dark | Light | When |
|---|---|---|---|
| `--accent` | `#f97316` | `#c2410c` | the thing the operator is here to do |
| `--accent-dim` | `#c2560e` | `#c2410c` | the accent, pressed |
| `--success` | `#3ad389` | `#0fa968` | it worked |
| `--warning` | `#ffca16` | `#d4a017` | it needs attention |
| `--danger` | `#ff5c5c` | `#e53e3e` | it did not work, or it would destroy something |
| `--info` | `#70b8ff` | `#3b9eff` | it is telling you something |
| `--brand` | `#9281f7` | `#6c5ce7` | reserved for the brand itself — **not** for a control |

### The shape

| Group | Tokens |
|---|---|
| **Radii** | `--radius-sm` 4px · `--radius-md` 6px · `--radius-lg` 10px · `--radius-xl` 14px · `--radius-full` |
| **Elevation** | `--elevation-sm` (a border's shadow) · `--elevation-md` (a menu) · `--elevation-lg` (a dialog) |
| **Depth** | `--z-base` 0 · `--z-sticky` 10 · `--z-dropdown` 20 · `--z-drawer` 30 · `--z-overlay` 40 · `--z-modal` 50 · `--z-toast` 60 |
| **Motion** | `--motion-fast` 120ms · `--motion-base` 200ms · `--motion-slow` 320ms · `--ease-out` |
| **Focus** | `--focus-ring` — the accent at 4px with a canvas-coloured gap · `--focus-ring-danger` |

**The focus ring is the accent itself**, set off from the surface by the
canvas. The ring it replaced was the accent at 12% — over the surface that
came to about 1.1:1, which is invisible, and `outline: none` had removed
the browser's own. WCAG 2.2 SC 2.4.11 wants 3:1; this clears it.

**Less motion when the person asks for less**: `prefers-reduced-motion` turns
every transition and animation down to nothing.

### Typography

| | |
|---|---|
| **Sans** | Inter, system-ui — the interface |
| **Mono** | JetBrains Mono, ui-monospace — code, ids, addresses |
| **Display** | DM Serif Display — the landing page only |

The scale is Tailwind's, and it is used as it is:

| Size | Where |
|---|---|
| `text-3xl` | a single number that is the point of a panel |
| `text-xl` | a page title |
| `text-base` / `text-sm` | body |
| `text-xs` | supporting text, labels, metadata |
| `text-[10px]` | a badge, a caption, an eyebrow |

Weights: `font-medium` for anything the operator has to read, `font-semibold`
for headings, `font-bold` for the page title and the numbers.

### Spacing

Tailwind's scale, with one rule: **a panel's padding is `--spacing` of 4
(`p-4`), a page's is 6 (`p-6`), and the gap between panels is 4 (`gap-4`)**.
The rhythm comes from the spacing, not from one-off margins.

---

## 3. The components

They live in `packages/ui` — the shared, framework-agnostic layer. A
component renders and emits; it never fetches, never validates and never
knows about a project.

| Component | What it is for | Variants / states |
|---|---|---|
| `Button` | an action | `primary` · `secondary` · `outline` · `ghost` · `danger`; `sm`/`md`/`lg`; `loading`; **defaults to `type="button"`** |
| `IconButton` | an action that is only an icon | `ghost`/`outline`/`danger`; `sm`/`md`; always has a name |
| `Input` | one line of text | label, hint, error; the label names the control |
| `Textarea` | more than one line | label, hint, error |
| `Select` | a choice from a known list | `options`, `placeholder`, label, hint, error |
| `Checkbox` | a yes or a no | label, description |
| `Switch` | a setting that is on or off | checked, label, description |
| `FormField` | a label, a control and a message, wired together | `error`, `hint`, `required` |
| `Card` | a panel | `padding`: `none`/`sm`/`md`/`lg` |
| `Table` | a list of things | `caption`, `layout`; scrolls sideways, never clips |
| `Pagination` | the pages of a list | page, pages, total |
| `Badge` | a short status | `default`/`accent`/`success`/`warning`/`danger`/`info`; `solid` |
| `StatusDot` | a status, with its **name** | `success`/`warning`/`danger`/`info`/`neutral` |
| `Modal` | a dialog | `sm`/`md`/`lg`/`xl`; a real dialog: named, modal, focus-trapped, focus restored |
| `DropdownMenu` | a menu of actions | items with `icon`, `disabled`, `danger`; Escape, arrows, click-away |
| `Tooltip` | a hint | `top`/`bottom`; announced with the control |
| `Tabs` | switching between views | `sm`/`md`, `fullWidth`; arrows move, `aria-selected` |
| `Toast` | a transient message | `success`/`error`/`warning`/`info` |
| `EmptyState` | there is nothing here | title, description, action |
| `ErrorState` | it could not be done | title, message, action; `role="alert"` |
| `Spinner` | it is happening | `sm`/`md`/`lg` |
| `Stepper` | how far along | steps with a state |
| `PageHeader` | the top of a screen | title, description, actions, above |
| `SectionHeader` | the top of a section | title, description, actions |
| `SearchField` | a search box | label (always), clear button |
| `CodeBlock` | a piece of configuration | label, language, copyable |
| `Breadcrumb` | the way back | items with an optional `href`; the current page is marked |
| `Dropzone` | a file | — |

### Using them

```tsx
// A form field: the label names the control, the message is announced with it.
<FormField label="Repository" error={error} required>
  {(props) => <Input {...props} placeholder="github.com/owner/repo" />}
</FormField>

// A screen: a header, then the panels.
<PageHeader
  title="Projects"
  description="The projects you can reach."
  actions={<Button size="sm">New project</Button>}
/>

// A list that failed: a state, not a message that vanishes.
{error ? (
  <ErrorState message={error} action={{ label: 'Try again', onClick: reload }} />
) : (
  <Table caption="The projects">…</Table>
)}
```

---

## 4. Accessibility

These are requirements, not aspirations. The tests in
`packages/ui/src/components/` hold the components to them.

| Rule | What it means |
|---|---|
| **Every control has a name** | a label, an `aria-label`, or text. An icon button with no name is a mystery |
| **A label is connected to its control** | `htmlFor` and an `id` that is unique on the page — two fields with the same label used to share one id |
| **A message is announced with its control** | `aria-describedby`, and `aria-invalid` when it is an error |
| **The focus ring is visible** | `--focus-ring`, at least 3:1 against the surface |
| **A dialog is a dialog** | `role="dialog"`, `aria-modal`, a name, the focus inside it, and the focus back where it came from |
| **The keyboard reaches everything** | nothing is reachable only by mouse; menus and tabs are operated with the arrows |
| **The status is a word, not only a colour** | a dot carries its name |
| **The table is a table** | `caption`, `scope="col"`, and it scrolls rather than clips |
| **Motion is optional** | `prefers-reduced-motion` is honoured |
| **No browser dialogs** | `alert()` and `confirm()` are not the product's dialogs — `Modal` and `ConfirmDialog` are |

---

## 5. Adoption

The components were rolled out to a **representative set** first, so that the
system was measured against real screens rather than a mock-up:

| Screen | What it uses now |
|---|---|
| Platform overview | `PageHeader`, `Button`, `ErrorState` |
| Projects list | `PageHeader`, `IconButton`, the shared `Input` |
| Project overview | `SectionHeader`, the shared `Card` |
| Database console | the shared `Select` (it had a hand-rolled one) |
| Functions console | `PageHeader`, and the violet tile replaced with the accent |
| Email console | `PageHeader`, `ErrorState` for a failed load |
| Settings | `PageHeader`, and a "This platform" card for the platform's own surfaces |

### How the rest gets there

1. **One screen at a time**, starting with the ones an operator uses most.
2. **Presentation only.** The components change what a screen *looks like*,
   never what it does: no API call, no permission rule, no data ownership
   moves.
3. **The old component stays until its screen is done.** Nothing is deleted
   halfway through.
4. **The tests travel with it.** A screen that changes gets its test updated
   in the same change — the Phase 2 contract tests and the Phase 3
   navigation tests are the floor.

---

## 6. What is not settled

Recorded, so that it is not rediscovered as a bug:

| The gap | Where it belongs |
|---|---|
| Ninety-two controls have no programmatic label | the design system's `FormField` is the fix; the screens come later |
| Eighty-four percent of the product's "it worked" messages never rendered | **fixed** — the toast provider is mounted above every screen |
| Sixteen dialogs hand-roll their overlay | the shared `Modal` is the fix; the screens come later |
| The shared `Modal` had no dialog semantics or focus trap | **fixed** |
| The `Button` had no `type`, so a "Cancel" submitted the form | **fixed** |
| The focus ring was invisible | **fixed** |
| Nineteen tables overflow on a phone | the shared `Table` is the fix; the screens come later |
| Hardcoded palette colours break the dark theme | the tokens are the fix; the screens come later |
| The specification promised components that were never built (`DataTable`, `FilterBar`, `Breadcrumbs`, `EntityCard`, `KeyValueTable`) | the shared `Table`, `SearchField`, `Breadcrumb` and `Card` are what exists; the rest is a later decision |
