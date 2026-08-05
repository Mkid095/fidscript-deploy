'use client';

import dynamic from 'next/dynamic';

const MonacoEditor = dynamic(() => import('@monaco-editor/react'), { ssr: false });

interface SqlEditorMonacoProps {
  value: string;
  onChange: (val: string) => void;
  onMount: (editor: unknown) => void;
}

export function SqlEditorMonaco({ value, onChange, onMount }: SqlEditorMonacoProps) {
  return (
    <MonacoEditor
      height="100%"
      language="sql"
      value={value}
      onChange={val => onChange(val ?? '')}
      onMount={onMount}
      theme="vs-dark"
      options={{
        minimap: { enabled: false },
        fontSize: 13,
        lineNumbers: 'on',
        scrollBeyondLastLine: false,
        wordWrap: 'on',
        tabSize: 2,
        padding: { top: 12, bottom: 12 },
        renderLineHighlight: 'line',
        scrollbar: { verticalScrollbarSize: 6, horizontalScrollbarSize: 6 },
        suggestOnTriggerCharacters: true,
      }}
    />
  );
}
