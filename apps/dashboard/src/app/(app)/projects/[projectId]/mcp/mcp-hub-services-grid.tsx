'use client';

import { HugeiconsIcon } from '@hugeicons/react';
import {
  Database01Icon,
  HardDriveIcon,
  Share08Icon,
  FlashIcon,
  Clock01Icon,
  Mail01Icon,
  ArrowRight01Icon,
} from '@hugeicons/core-free-icons';

interface McpHubServicesGridProps {
  projectId: string;
}

const SERVICES = [
  { title: 'Databases', href: '/databases', icon: Database01Icon, desc: 'PostgreSQL with connection pooling and backups.' },
  { title: 'Storage', href: '/storage', icon: HardDriveIcon, desc: 'S3-compatible object storage with presigned URLs.' },
  { title: 'Queues', href: '/queues', icon: Share08Icon, desc: 'Durable message queues with dead-letter handling.' },
  { title: 'Realtime', href: '/realtime', icon: FlashIcon, desc: 'WebSocket channels for live data.' },
  { title: 'Scheduler', href: '/scheduler', icon: Clock01Icon, desc: 'Cron jobs with Redis-locked execution.' },
  { title: 'Email', href: '/email', icon: Mail01Icon, desc: 'Transactional email with your own domains.' },
];

export function McpHubServicesGrid({ projectId }: McpHubServicesGridProps) {
  const base = `/projects/${projectId}`;
  return (
    <section className="space-y-3">
      <h2 className="text-sm font-semibold text-[var(--text-dim)] uppercase tracking-wide">Services</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {SERVICES.map((svc) => (
          <a key={svc.href} href={`${base}${svc.href}`}
            className="group flex flex-col gap-2 border border-[var(--rail)] rounded-lg p-4 bg-[var(--surface)] hover:border-[var(--rail-light)] transition-colors">
            <div className="flex items-center justify-between">
              <div className="w-8 h-8 rounded-md bg-[var(--rail)] flex items-center justify-center text-[var(--text-muted)] group-hover:text-[var(--accent)] transition-colors">
                <HugeiconsIcon icon={svc.icon} size={16} />
              </div>
              <HugeiconsIcon icon={ArrowRight01Icon} size={13} className="text-[var(--text-dim)] group-hover:text-[var(--accent)] transition-colors" />
            </div>
            <div>
              <p className="text-sm font-semibold text-[var(--text)]">{svc.title}</p>
              <p className="text-xs text-[var(--text-muted)] mt-0.5 leading-relaxed">{svc.desc}</p>
            </div>
          </a>
        ))}
      </div>
    </section>
  );
}
