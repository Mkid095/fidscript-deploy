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
    return <p className="text-sm text-slate-500">No members yet.</p>;
  }

  return (
    <div className="flex flex-col gap-2">
      {members.map(member => (
        <Card key={member.userId} className="border border-[#1e2130] py-3 px-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-200">{member.email}</p>
              <p className="text-xs text-slate-500">
                Joined {new Date(member.joinedAt).toLocaleDateString()}
              </p>
            </div>
            <span className={`text-xs px-2 py-0.5 rounded-full border capitalize ${
              member.role === 'owner'   ? 'bg-amber-900/60 text-amber-400 border-amber-800' :
              member.role === 'admin'   ? 'bg-blue-900/60 text-blue-400 border-blue-800' :
              member.role === 'developer' ? 'bg-green-900/60 text-green-400 border-green-800' :
              'bg-slate-800 text-slate-400 border-slate-700'
            }`}>
              {member.role}
            </span>
          </div>
        </Card>
      ))}
    </div>
  );
}
