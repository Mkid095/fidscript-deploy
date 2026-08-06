'use client';

import { Input } from '@fidscript/ui';
import { HttpHeadersInput } from './http-headers-input';
import { HTTP_METHODS } from './job-form-types';

interface HttpEndpointFieldsProps {
  endpoint: string;
  httpMethod: string;
  httpHeaders: { key: string; value: string }[];
  onEndpointChange: (v: string) => void;
  onMethodChange: (v: string) => void;
  onHeadersChange: (headers: { key: string; value: string }[]) => void;
}

export function HttpEndpointFields({
  endpoint, httpMethod, httpHeaders,
  onEndpointChange, onMethodChange, onHeadersChange,
}: HttpEndpointFieldsProps) {
  return (
    <>
      <div>
        <label className="block text-xs text-[var(--text-muted)] mb-1.5 font-medium">URL</label>
        <Input value={endpoint} onChange={e => onEndpointChange(e.target.value)}
          placeholder="https://api.example.com/webhook"
          className="bg-[var(--surface-2)] border border-[var(--rail)] text-[var(--text)] w-full text-sm" />
      </div>
      <div className="grid grid-cols-[120px_1fr] gap-3">
        <div>
          <label className="block text-xs text-[var(--text-muted)] mb-1.5 font-medium">Method</label>
          <select value={httpMethod} onChange={e => onMethodChange(e.target.value)}
            className="bg-[var(--surface-2)] border border-[var(--rail)] text-[var(--text)] rounded-lg px-3 py-2 text-sm w-full">
            {HTTP_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
        <HttpHeadersInput headers={httpHeaders} onChange={onHeadersChange} />
      </div>
    </>
  );
}