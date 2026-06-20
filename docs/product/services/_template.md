# Service Spec — `<service>`

> Every service in FIDScript gets one of these. Cross-reference: **backend inventory** IDs
> (`docs/phases/frontend/backend/`), **navigation** (`docs/product/navigation.md`),
> **user journeys** (`docs/product/user-journeys.md`), and the **frontend phase** that
> implements this surface (`docs/phases/frontend/fNN-*.md`).

## 1. Purpose
One or two lines: what this service does, and the user value.

## 2. Screens
List the screens that live in this service. Reference `docs/product/navigation.md` for the
sidebar entry, the children, permissions, and empty state. One line per screen.

## 3. Data model
Key entities (Prisma tables) and the fields a user sees. For each: type, required?, notes.
Cross-reference `apps/api/prisma/schema.prisma` (search for `model <Name>`).

## 4. API mapping
For every action the user can take, the backend inventory ID. Group by intent (CRUD, actions,
queries). Use the stable IDs from `docs/phases/frontend/backend/<cluster>.md`.

## 5. Realtime events
Exact event strings emitted/listened to. All are fanned out to the `project:<id>` socket room.

## 6. Settings
Configurable knobs (project-level + platform-level). State which are auto-managed (per Principle 1)
and which the user touches.

## 7. Automation
What runs automatically. Triggers, observable results, how to re-run manually, what fails look like.

## 8. Dependencies
- **Hard** (this service cannot work without X).
- **Soft** (degrades gracefully).
- **Backend gaps** (from the audit) that affect this service.

## 9. Phase
Which FNN implements it. Where it's specced, where it's verified.
