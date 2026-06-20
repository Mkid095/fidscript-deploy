# Component Spec — `CodeBlock`

> Syntax-highlighted code block with a Copy button. Used by Logs (terminal lines), Docs,
> Function response, Version diff.

## 1. Purpose
The user sees code in a readable, copyable form. The principle: **code is text; the block
is the canvas.**

## 2. Props
```ts
type CodeBlockProps = {
  /** The code. */
  code: string;
  /** The language (drives syntax highlighting). */
  language: 'json' | 'javascript' | 'typescript' | 'python' | 'bash' | 'sql' | 'plaintext';
  /** Show line numbers (default true). */
  lineNumbers?: boolean;
  /** Wrap long lines (default false). */
  wrap?: boolean;
  /** Truncate after N lines (default: no truncation). */
  maxLines?: number;
  /** Show a copy button (default true). */
  copyButton?: boolean;
  /** Optional title (e.g. "Response"). */
  title?: string;
};
```

## 3. Visual anatomy
```
┌─────────────────────────────────────────────────────────────┐
│ Response                                          [Copy]   │
│ {                                                          │
│   "success": true,                                         │
│   "output": "Hello, world"                                 │
│ }                                                          │
└─────────────────────────────────────────────────────────────┘
```

## 4. States
- **Idle**: code block with syntax highlighting.
- **Copied**: "Copied" indicator (2s) on the copy button.
- **Truncated**: "Show more" button at the bottom.
- **Loading**: skeleton.

## 5. Variants
- **Language**: json | javascript | typescript | python | bash | sql | plaintext.
- **Wrap / no-wrap**.
- **Density**: comfortable (default); compact.

## 6. Interactions
- **Copy**: copies the rendered text.
- **Show more**: expands the truncated block.
- **Hover**: subtle border highlight.

## 7. Accessibility
- **Pre**: `<pre>` with `<code>` inside; `aria-label` set to the language.
- **Copy**: `aria-label="Copy code"`.
- **Tabindex**: `tabindex="0"` for keyboard scrolling of long lines.

## 8. Telemetry / events
- `code_block.copy_clicked` → `{ language, lineCount }`.
- `code_block.expand_clicked` → `{ id }`.

## 9. Cross-references
- **Screens**: Logs, Docs, Function response, Version diff, Connection info.

## 10. Acceptance criteria
- Renders code with syntax highlighting.
- Copy button works.
- Truncation + Show more works.
- Wrap toggle works.
- Long lines scroll horizontally (keyboard-accessible).
- Theme-aware.