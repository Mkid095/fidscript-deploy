# Component Spec — `FunctionCodeEditor`

> Monaco-based code editor for the Function detail → Code tab. Language matches the
> runtime; supports Save (draft), Format, Reset, Deploy.

## 1. Purpose
The user writes function code in a familiar editor. The principle: **the editor is a
real editor — syntax highlighting, autosave, format, deploy.**

## 2. Props
```ts
type FunctionCodeEditorProps = {
  /** The current deployed code. */
  deployedCode: string;
  /** The current draft (if any) — overrides the deployed code on mount. */
  draftKey?: string; // localStorage key
  /** The runtime (drives the language). */
  runtime: 'nodejs' | 'python';
  /** Save draft callback. */
  onSaveDraft: (code: string) => void;
  /** Format callback (Prettier for nodejs, Black for python). */
  onFormat: (code: string) => string;
  /** Deploy callback. */
  onDeploy: (code: string) => void;
  /** Read-only mode (for viewers). */
  readOnly?: boolean;
};
```

## 3. Visual anatomy
```
┌────────────────────────────────────────────────────────────────────┐
│ 1  export const handler = async (req) => {                         │
│ 2    const body = await req.json();                                │
│ 3    console.log('received', body);                                │
│ 4    return new Response(JSON.stringify({ ok: true }), {           │
│ 5      headers: { 'content-type': 'application/json' }             │
│ 6    });                                                           │
│ 7  };                                                              │
│ 8                                                                  │
│ ...                                                                │
└────────────────────────────────────────────────────────────────────┘
```

## 4. States
- **Idle**: shows the deployed code.
- **Editing**: dirty state; Save + Deploy are enabled.
- **Deploying**: editor greys + "Deploying…" badge in the header.
- **Deployed**: editor re-enables; the deployed code updates.
- **Failed**: error toast + "Revert to deployed" button.
- **Draft restored**: banner "Draft from <timestamp>" with "Discard" + "Keep".
- **Read-only**: editor renders the deployed code; no editing.

## 5. Variants
- **Language**: javascript/typescript (nodejs), python (python).
- **Theme**: dark (default, matches dashboard), light.

## 6. Interactions
- **Edit**: standard Monaco interactions.
- **Save**: persists to `localStorage` (key `fidscript.fnDraft.<functionId>`).
- **Format**: runs Prettier / Black; replaces the editor contents.
- **Deploy**: opens the deploy dialog.
- **Reset**: reverts to the deployed code (clears the draft).
- **Diff toggle**: shows the diff with the deployed version.

## 7. Accessibility
- **Editor**: Monaco has full a11y support (screen reader, keyboard nav).
- **Toolbar**: standard button semantics.
- **Live region**: `aria-live="polite"` on the deploy state.

## 8. Telemetry / events
- `function_code_editor.changed` → `{ length }`.
- `function_code_editor.deploy_clicked` → `{ length, version }`.
- `function_code_editor.format_clicked` → `{ runtime }`.

## 9. Cross-references
- **Screens**: Function detail → Code.

## 10. Acceptance criteria
- Monaco renders the deployed code on mount.
- The draft (if present) is restored with a banner.
- Save persists to `localStorage`.
- Format runs the right formatter.
- Deploy opens the deploy dialog.
- Reset reverts.
- Diff toggle shows a side-by-side diff.
- Viewer greys the editor (read-only).
- Theme matches the dashboard.