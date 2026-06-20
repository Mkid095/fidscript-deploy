# Component Spec — `Breadcrumbs`

> The breadcrumb trail rendered in the header. `Projects › project › section › resource`.
> Clickable segments; the rightmost is the page title.

## 1. Purpose
The user always knows where they are. The principle: **the breadcrumb is a constant; the
URL carries it for free.**

## 2. Props
```ts
type BreadcrumbsProps = {
  /** The breadcrumb segments (in order). */
  segments: Array<{
    label: string;
    href?: string; // optional; the rightmost has no href
  }>;
};
```

## 3. Visual anatomy
```
Projects › my-app › Deployments › deploy-abc123
   ↑        ↑          ↑              ↑
   click    click      click          (page title; not clickable)
```

## 4. States
- **Idle**: the segments render with `›` separators.
- **Hover**: clickable segments underline.
- **Truncation**: if the project name is long (>30 chars), truncate with ellipsis
  (tooltip with full name).
- **Loading**: skeleton (rare; the project name is in the shell's context).

## 5. Variants
- **Density**: comfortable (default).
- **Truncation**: middle-truncation if the trail is too long (e.g.
  `Projects › … › Deployments › deploy-abc123`).

## 6. Interactions
- **Click segment** → navigate client-side to `href`.
- **Rightmost segment** has no `href` (it's the page title).
- **Keyboard**: Tab through segments; Enter activates.

## 7. Accessibility
- **Landmark**: `<nav aria-label="Breadcrumb">`.
- **List**: `<ol>` (ordered list, since the trail is hierarchical).
- **Current**: the rightmost `<li>` has `aria-current="page"`.
- **Separator**: `aria-hidden="true"` on the `›` character.

## 8. Telemetry / events
- `breadcrumb.segment_clicked` → `{ userId, segmentLabel, href }`.

## 9. Cross-references
- **Screens**: every nested screen.
- **Service**: `docs/product/navigation.md` §"Breadcrumbs (canonical form)".

## 10. Acceptance criteria
- The breadcrumb follows the canonical form (`Projects › project › section › resource`).
- Clicking a segment navigates client-side.
- The rightmost segment is the page title (not clickable; `aria-current="page"`).
- The `›` separator is `aria-hidden`.
- Truncation works with a tooltip on hover.
- Keyboard navigation works.