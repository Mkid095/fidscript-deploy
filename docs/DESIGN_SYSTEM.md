# Design System

Visual language and component standards for the FIDScript Dashboard.

---

## Design Principles

### 1. Functional Over Decorative

Every visual element serves a purpose. Avoid purely decorative elements that add cognitive load without providing information or interaction value.

### 2. Consistent Hierarchy

Information hierarchy is communicated through size, weight, and spacing. Users should understand importance at a glance without conscious effort.

### 3. Accessible by Default

All components meet WCAG 2.1 AA standards. Color contrast, focus states, and screen reader support are not afterthoughts.

### 4. Dark-First

The primary interface is dark-themed. Light themes are secondary and must not break dark-first assumptions in component logic.

### 5. Monospace for Technical Data

Code, IDs, timestamps, and technical values use monospace fonts. This aids scanning and prevents character confusion (0 vs O, 1 vs l).

---

## Color Palette

### Background Colors

| Token | Hex | Usage |
|-------|-----|-------|
| `--bg-base` | `#080a0d` | Page background |
| `--bg-surface` | `#0c0f14` | Card backgrounds |
| `--bg-elevated` | `#121318` | Modal, dropdown backgrounds |
| `--bg-overlay` | `rgba(0,0,0,0.8)` | Modal overlay |

### Border Colors

| Token | Hex | Usage |
|-------|-----|-------|
| `--border-subtle` | `#13161c` | Subtle dividers |
| `--border-default` | `#1e2329` | Default borders |
| `--border-strong` | `#2d333b` | Emphasized borders |

### Text Colors

| Token | Hex | Usage |
|-------|-----|-------|
| `--text-primary` | `#eaeef4` | Primary text |
| `--text-secondary` | `#8b949e` | Secondary text |
| `--text-muted` | `#6e7681` | Tertiary/disabled text |
| `--text-inverse` | `#0d1117` | Text on light backgrounds |

### Accent Colors

| Token | Hex | Usage |
|-------|-----|-------|
| `--accent-primary` | `#dc2626` | Primary actions, brand |
| `--accent-primary-hover` | `#ef4444` | Primary hover state |
| `--accent-secondary` | `#f97316` | Secondary highlights |

### Semantic Colors

| Token | Hex | Usage |
|-------|-----|-------|
| `--success` | `#22c55e` | Success states |
| `--success-bg` | `rgba(34,197,94,0.1)` | Success backgrounds |
| `--warning` | `#f59e0b` | Warning states |
| `--warning-bg` | `rgba(245,158,11,0.1)` | Warning backgrounds |
| `--error` | `#dc2626` | Error states |
| `--error-bg` | `rgba(220,38,38,0.1)` | Error backgrounds |
| `--info` | `#3b82f6` | Informational |
| `--info-bg` | `rgba(59,130,246,0.1)` | Info backgrounds |

### Neutral Colors

| Token | Hex | Usage |
|-------|-----|-------|
| `--gray-50` | `#f9fafb` | Lightest gray |
| `--gray-100` | `#f3f4f6` | Light gray |
| `--gray-200` | `#e5e7eb` | Border light |
| `--gray-300` | `#d1d5db` | Disabled text |
| `--gray-400` | `#9ca3af` | Muted text |
| `--gray-500` | `#6b7280` | Placeholder |
| `--gray-600` | `#4b5563` | Secondary text |
| `--gray-700` | `#374151` | Tertiary bg |
| `--gray-800` | `#1f2937` | Card bg |
| `--gray-900` | `#111827` | Dark surface |
| `--gray-950` | `#030712` | Darkest |

---

## Typography

### Font Families

**Primary Font:** `Plus Jakarta Sans` (sans-serif)
- Used for: Body text, UI labels, headings (except code-related)

**Monospace Font:** `JetBrains Mono` (monospace)
- Used for: Code, IDs, technical values, timestamps, file paths

### Type Scale

| Name | Size | Weight | Line Height | Usage |
|------|------|--------|-------------|-------|
| `text-xs` | 12px | 400 | 16px | Secondary labels, captions |
| `text-sm` | 14px | 400 | 20px | Body text, descriptions |
| `text-base` | 16px | 400 | 24px | Large body text |
| `text-lg` | 18px | 500 | 28px | Small headings |
| `text-xl` | 20px | 600 | 28px | Section headings |
| `text-2xl` | 24px | 700 | 32px | Page titles |
| `text-3xl` | 30px | 700 | 36px | Hero headings |

### Font Weights

| Name | Value | Usage |
|------|-------|-------|
| `font-normal` | 400 | Body text |
| `font-medium` | 500 | Emphasized body |
| `font-semibold` | 600 | Labels, buttons |
| `font-bold` | 700 | Headings |

---

## Spacing System

Base unit: 4px

| Token | Value | Usage |
|-------|-------|-------|
| `space-1` | 4px | Tight spacing |
| `space-2` | 8px | Icon gaps |
| `space-3` | 12px | Small padding |
| `space-4` | 16px | Default padding |
| `space-5` | 20px | Card padding |
| `space-6` | 24px | Section gaps |
| `space-8` | 32px | Large gaps |
| `space-10` | 40px | Page margins |
| `space-12` | 48px | Section spacing |

---

## Border Radius

| Token | Value | Usage |
|-------|-------|-------|
| `radius-sm` | 4px | Badges, small elements |
| `radius-md` | 8px | Buttons, inputs |
| `radius-lg` | 12px | Cards |
| `radius-xl` | 16px | Modals |
| `radius-full` | 9999px | Pills, avatars |

---

## Shadows

| Token | Value | Usage |
|-------|-------|-------|
| `shadow-sm` | `0 1px 2px rgba(0,0,0,0.3)` | Subtle elevation |
| `shadow-md` | `0 4px 6px rgba(0,0,0,0.4)` | Cards |
| `shadow-lg` | `0 10px 15px rgba(0,0,0,0.5)` | Modals |
| `shadow-glow` | `0 0 20px rgba(220,38,38,0.2)` | Primary button glow |

---

## Component Specifications

### Button

**Variants:**
- `primary` - Red background, white text
- `secondary` - Transparent, border, gray text
- `ghost` - Transparent, no border, gray text
- `danger` - Red background, white text

**Sizes:**
- `sm` - Height 32px, padding 8px 12px, text-xs
- `md` - Height 40px, padding 12px 16px, text-sm
- `lg` - Height 48px, padding 16px 24px, text-base

**States:**
- Default
- Hover: Lighten background 10%
- Active: Darken background 5%
- Disabled: 50% opacity, cursor not-allowed
- Loading: Show spinner, disable interaction

**Usage:**
```tsx
<Button variant="primary" size="md">
  Deploy Project
</Button>
```

---

### Input

**Specifications:**
- Height: 40px
- Background: `--bg-surface`
- Border: 1px `--border-default`
- Border radius: 8px
- Padding: 0 12px
- Text: text-sm `--text-primary`
- Placeholder: `--text-muted`

**States:**
- Default: `--border-default`
- Focus: Border `--accent-primary`, ring 2px `--accent-primary/20`
- Error: Border `--error`, background `--error-bg`
- Disabled: Background `--bg-base`, 50% opacity

**Usage:**
```tsx
<Input
  placeholder="Enter project name"
  value={name}
  onChange={(e) => setName(e.target.value)}
/>
```

---

### Card

**Specifications:**
- Background: `--bg-surface`
- Border: 1px `--border-subtle`
- Border radius: 12px
- Padding: 20px

**Variants:**
- Default: Standard card
- Interactive: Hover border `--border-strong`, cursor pointer
- Selected: Border `--accent-primary`

**Usage:**
```tsx
<Card interactive onClick={() => selectProject(id)}>
  <Card.Header>Project Name</Card.Header>
  <Card.Body>Description</Card.Body>
</Card>
```

---

### Table

**Specifications:**
- Header: Background `--bg-elevated`, text-xs, uppercase, font-semibold
- Row: Border-bottom `--border-subtle`, hover background `--bg-elevated`
- Cell: Padding 12px 16px, text-sm

**Features:**
- Sortable columns: Show sort indicator
- Selectable rows: Checkbox column
- Pagination: Bottom right, show total count

**Usage:**
```tsx
<Table
  data={projects}
  columns={[
    { key: 'name', header: 'Name' },
    { key: 'status', header: 'Status' },
    { key: 'created', header: 'Created' },
  ]}
/>
```

---

### Modal

**Specifications:**
- Overlay: `--bg-overlay`, backdrop-blur 4px
- Container: Background `--bg-elevated`, border radius 16px, max-width 512px
- Padding: 24px
- Header: Font-semibold text-lg, border-bottom `--border-subtle`
- Footer: Border-top `--border-subtle`, justify-end

**Sizes:**
- `sm` - max-width 384px
- `md` - max-width 512px
- `lg` - max-width 640px
- `xl` - max-width 768px

**Usage:**
```tsx
<Modal
  open={isOpen}
  onClose={() => setIsOpen(false)}
  title="Create Project"
  size="md"
>
  <Modal.Body>
    <Form />
  </Modal.Body>
  <Modal.Footer>
    <Button variant="secondary" onClick={() => setIsOpen(false)}>
      Cancel
    </Button>
    <Button variant="primary">Create</Button>
  </Modal.Footer>
</Modal>
```

---

### Badge

**Variants:**
- `default` - Gray background, gray text
- `success` - Green background, green text
- `warning` - Amber background, amber text
- `error` - Red background, red text
- `info` - Blue background, blue text

**Specifications:**
- Padding: 2px 8px
- Border radius: 4px
- Font: text-xs, font-semibold
- Text transform: uppercase

**Usage:**
```tsx
<Badge variant="success">ACTIVE</Badge>
```

---

### Navigation

**Sidebar:**
- Width: 240px (expanded), 64px (collapsed)
- Background: `--bg-surface`
- Item height: 40px
- Item padding: 0 12px
- Active indicator: 2px left border `--accent-primary`

**Tabs:**
- Height: 40px
- Underline: 2px `--accent-primary` for active
- Text: text-sm, font-medium

---

### Toast Notifications

**Position:** Bottom right, stacked

**Variants:**
- Success: Left border 3px `--success`
- Error: Left border 3px `--error`
- Warning: Left border 3px `--warning`
- Info: Left border 3px `--info`

**Specifications:**
- Background: `--bg-elevated`
- Border radius: 8px
- Padding: 12px 16px
- Shadow: shadow-lg

**Duration:** 5000ms, dismissible

---

## Icon Usage

**Icon Library:** Lucide React

**Sizing:**
- `icon-sm` - 16px
- `icon-md` - 20px
- `icon-lg` - 24px

**Color:** Inherit from parent text color

**Usage:**
```tsx
import { Server, Database } from 'lucide-react';

<Server className="icon-md" />
```

---

## Empty States

**Specifications:**
- Icon: 48px, `--text-muted` color
- Title: text-base, font-semibold
- Description: text-sm, `--text-secondary`
- Action: Optional primary button

**Usage:**
```tsx
<EmptyState
  icon={Server}
  title="No projects yet"
  description="Create your first project to get started"
  action={
    <Button variant="primary" onClick={createProject}>
      Create Project
    </Button>
  }
/>
```

---

## Loading States

**Spinner:**
- Size: 16px (inline), 24px (standalone)
- Color: `--accent-primary`
- Animation: Rotate 1s linear infinite

**Skeleton:**
- Background: `--bg-elevated`
- Animation: Pulse 1.5s ease-in-out infinite
- Border radius: Match content type (4px for text, 8px for cards)

**Usage:**
```tsx
<Skeleton variant="text" width="60%" />
<Skeleton variant="card" />
```

---

## Responsive Breakpoints

| Name | Min Width | Usage |
|------|----------|-------|
| `sm` | 640px | Small tablets |
| `md` | 768px | Tablets |
| `lg` | 1024px | Laptops |
| `xl` | 1280px | Desktops |
| `2xl` | 1536px | Large screens |

---

## Motion Guidelines

**Duration:**
- Fast: 150ms - Hover states, small transitions
- Normal: 250ms - Default transitions
- Slow: 350ms - Page transitions, large movements

**Easing:**
- Default: `ease-out` - Elements entering
- Enter: `ease-out` - Fade/slide in
- Exit: `ease-in` - Fade/slide out
- Bounce: `cubic-bezier(0.34, 1.56, 0.64, 1)` - Emphasis

**Usage:**
```css
transition: all 250ms ease-out;
```
