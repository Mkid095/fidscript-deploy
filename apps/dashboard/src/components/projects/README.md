# Projects Components

The new-project modal + form, used from any "Create project" CTA.

## Files

| File | Purpose |
|------|---------|
| `create-project-modal.tsx` | Wraps `Modal` and hosts the form. Resets + focuses on open. Exposes `onClose` and `onCreated`. |
| `create-project-form.tsx` | Pure form (props in / events out). Renders name, slug, type, description + submit/cancel. |
| `create-project-hooks.ts` | `useCreateProjectForm` — owns form state, debounced duplicate check via `sdk.projects.list()`, submit. |
| `create-project-types.ts` | `CreateProjectModalProps`, `ProjectType` (`'frontend' \| 'backend' \| 'worker' \| 'cron' \| 'docker' \| 'static'`), `PROJECT_TYPES` table. |
| `create-project-utils.ts` | `slugify(name)` — pure string transform. |

## Props

### `CreateProjectModal`
| Prop | Type | Required |
|------|------|----------|
| `open` | `boolean` | Yes |
| `onClose` | `() => void` | Yes |
| `onCreated` | `(project: Project) => void` | Yes |

## Usage
```tsx
<CreateProjectModal
  open={open}
  onClose={() => setOpen(false)}
  onCreated={(p) => router.push(`/projects/${p.id}`)}
/>
```

## Conventions
- `slug` auto-generates from `name` until the user clicks the lock button.
- Submit is gated by `canSubmit` (`name ≥ 3 chars`, no duplicate, not submitting).
- After a successful create, the form auto-resets on next close.