'use client';

import { useEffect, useState } from 'react';
import { Card, Spinner } from '@fidscript/ui';

import { useAuth } from '@/contexts/auth-context';
import type { Project, ProjectMember } from '@/types';

interface Props { project: Project }

export function MembersSection({ project }: Props) {
  const { getSdk } = useAuth();
  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const data = await getSdk().projects.listMembers(project.id);
      if (!cancelled) {
        setMembers(Array.isArray(data) ? data : (data as any).members ?? []);
        setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [project.id, getSdk]);

  if (loading) return <Spinner size="md" />;

  if (members.length === 0) {
    return <p className="text-sm text-[var(--text-muted)]">No members yet.</p>;
  }

  return (
    <div className="flex flex-col gap-2">
      {members.map(member => (
        <Card key={member.userId} className="border border-[var(--rail)] py-3 px-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-[var(--text)]">{member.email}</p>
              <p className="text-xs text-[var(--text-muted)]">
                Joined {new Date(member.joinedAt).toLocaleDateString()}
              </p>
            </div>
            <span className={`text-xs px-2 py-0.5 rounded-full border capitalize ${
              member.role === 'owner'   ? 'bg-amber-900/60 text-[var(--warning)] border-[var(--warning)]/30' :
              member.role === 'admin'   ? 'bg-blue-900/60 text-[var(--accent)] border-blue-800' :
              member.role === 'developer' ? 'bg-green-900/60 text-green-400 border-green-800' :
              'bg-[var(--rail)] text-[var(--text-muted)] border-[var(--rail-light)]'
            }`}>
              {member.role}
            </span>
          </div>
        </Card>
      ))}
    </div>
  );
}
