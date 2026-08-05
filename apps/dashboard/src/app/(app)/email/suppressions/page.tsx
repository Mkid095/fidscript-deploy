'use client';

import { useState } from 'react';
import { Button, Card, EmptyState, Input, Modal, Spinner } from '@fidscript/ui';

import { useSuppressions } from './suppressions-hooks';

const REASON_COLORS: Record<string, string> = {
  BOUNCE: 'bg-red-900 text-[var(--danger)]',
  COMPLAINT: 'bg-orange-900 text-orange-400',
  MANUAL: 'bg-blue-900 text-[var(--accent)]',
};

export default function SuppressionsPage() {
  const { items, loading, add, remove } = useSuppressions();
  const [showAdd, setShowAdd] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [adding, setAdding] = useState(false);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!newEmail.trim()) return;
    setAdding(true);
    try {
      await add(newEmail.trim());
      setNewEmail('');
      setShowAdd(false);
    } catch { /* ignore */ } finally {
      setAdding(false);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-[var(--text)] mb-1">Suppression List</h1>
          <p className="text-sm text-[var(--text-muted)]">{items.length} suppressed address{items.length !== 1 ? 'es' : ''}</p>
        </div>
        <Button variant="primary" size="sm" onClick={() => setShowAdd(true)}>Add Suppression</Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center min-h-48"><Spinner size="lg" /></div>
      ) : items.length === 0 ? (
        <Card className="border border-[var(--rail)]">
          <EmptyState
            title="No suppressed addresses"
            description="Recipients that bounce or file complaints are automatically added here to protect your sender reputation."
          />
        </Card>
      ) : (
        <Card className="border border-[var(--rail)] p-0 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--rail)] text-left">
                <th className="px-4 py-3 text-xs text-[var(--text-muted)] font-medium">Email</th>
                <th className="px-4 py-3 text-xs text-[var(--text-muted)] font-medium">Reason</th>
                <th className="px-4 py-3 text-xs text-[var(--text-muted)] font-medium">Added</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {items.map(item => (
                <tr key={item.id} className="border-b border-[var(--rail)] hover:bg-[var(--surface-2)]">
                  <td className="px-4 py-3 text-[var(--text)] font-mono text-xs">{item.email}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${REASON_COLORS[item.reason] ?? 'bg-[var(--rail)] text-[var(--text-muted)]'}`}>
                      {item.reason}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-[var(--text-muted)]">
                    {new Date(item.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => remove(item.email)}
                      className="text-xs text-[var(--danger)] hover:underline"
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      <Modal isOpen={showAdd} onClose={() => setShowAdd(false)} title="Add Suppression">
        <form onSubmit={handleAdd} noValidate>
          <div className="mb-4">
            <label className="block text-xs text-[var(--text-muted)] mb-1">Email Address</label>
            <Input
              type="email"
              value={newEmail}
              onChange={e => setNewEmail(e.target.value)}
              placeholder="spam@example.com"
              className="bg-[var(--surface-2)] border border-[var(--rail)] w-full"
            />
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="ghost" size="sm" type="button" onClick={() => setShowAdd(false)}>Cancel</Button>
            <Button variant="primary" size="sm" type="submit" loading={adding}>
              {adding ? 'Adding...' : 'Suppress'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
