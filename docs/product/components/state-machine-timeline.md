# Component Spec — `StateMachineTimeline`

> Horizontal state-machine progress indicator. 5 steps with timestamps; active step
> highlighted. Used by Deployment detail, Function deploy, Database provisioning, Email
> Domain verification.

## 1. Purpose
The user sees the state machine's progress visually. The principle: **a state machine is
a story; the timeline tells it.**

## 2. Props
```ts
type StateMachineTimelineProps = {
  /** The ordered steps. */
  steps: Array<{
    key: string;
    label: string;
    timestamp?: string; // ISO; absent if not yet reached
    status: 'pending' | 'active' | 'completed' | 'failed';
  }>;
  /** The current step key (drives the active highlight). */
  currentStep: string;
};
```

## 3. Visual anatomy
```
●────●────◐────○────○
PENDING QUEUED BUILDING DEPLOYING SUCCESS
0s    2s    18s   —     —
                ↑ (active = yellow + spinner)
```

## 4. States (per step)
- **Pending**: gray dot + gray label; not yet reached.
- **Active**: fire-red dot + label + spinner.
- **Completed**: green dot + check icon + green label; timestamp shown.
- **Failed**: red dot + x icon + red label; timestamp shown.

## 5. Variants
- **Horizontal** (default).
- **Vertical**: P1 follow-up (for narrow screens).
- **Density**: comfortable (default); compact (for inline use in cards).

## 6. Interactions
- **Hover step**: tooltip with the absolute timestamp + the step's label.
- **Click step**: (optional) navigate to the step's resource.

## 7. Accessibility
- **ARIA**: `role="list"`; each step `role="listitem"` with `aria-current="step"` on
  the active step.
- **Live region**: `aria-live="polite"` on the active step label — announces state
  changes ("Now deploying").
- **Reduced motion**: the spinner is disabled under `prefers-reduced-motion`.

## 8. Telemetry / events
- `state_machine_timeline.step_clicked` → `{ userId, stepKey }`.

## 9. Cross-references
- **Screens**: Deployment detail, Function deploy, Database provisioning, Email Domain
  verification.

## 10. Acceptance criteria
- Renders 5 (or more) steps horizontally.
- The active step has a spinner + fire-red accent.
- Completed steps have green checks; failed steps have red x's.
- Each step has a tooltip with the timestamp.
- The timeline is keyboard-accessible.
- Live region announces state changes.
- Reduced-motion preference is respected.