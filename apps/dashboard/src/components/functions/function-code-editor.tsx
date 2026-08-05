'use client';

import dynamic from 'next/dynamic';
import type { OnChange } from '@monaco-editor/react';

const MonacoEditor = dynamic(() => import('@monaco-editor/react'), { ssr: false });

interface FunctionCodeEditorProps {
  code: string;
  language: 'javascript' | 'python' | 'go' | 'rust' | 'plaintext';
  height: number;
  onChange: (value: string | undefined) => void;
}

export function FunctionCodeEditor({ code, language, height, onChange }: FunctionCodeEditorProps) {
  const handleChange: OnChange = value => onChange(value ?? '');

  return (
    <MonacoEditor
      height={`${height}px`}
      language={language}
      value={code}
      onChange={handleChange}
      theme="vs-dark"
      options={{
        minimap: { enabled: false },
        fontSize: 13,
        lineNumbers: 'on',
        scrollBeyondLastLine: false,
        wordWrap: 'on',
        tabSize: 2,
        padding: { top: 12 },
      }}
    />
  );
}