'use client';

import { HugeiconsIcon } from '@hugeicons/react';
import { ArrowUpRight01Icon, CheckmarkCircle01Icon, Download01Icon } from '@hugeicons/core-free-icons';
import { Button } from '@fidscript/ui';
import { applicationIcon } from './application-icons';
import type { Application, InstallJob } from '@fidscript-deploy/sdk';

interface ApplicationCardProps {
  application: Application;
  install: InstallJob | null;
  canInstall: boolean;
  onInstall: (id: string) => void;
}

/**
 * One application in the catalogue.
 *
 * An installed application opens on its own console. One that is not
 * installed carries an Install button — nothing is faked, and there is no
 * console link for an application that is not there.
 */
export function ApplicationCard({ application, install, canInstall, onInstall }: ApplicationCardProps) {
  const icon = applicationIcon(application.icon);
  const running = install?.status === 'running';

  return (
    <div className="flex flex-col rounded-xl border border-[var(--rail)] bg-[var(--surface)] p-5">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-lg bg-[var(--surface-2)] border border-[var(--rail)] flex items-center justify-center shrink-0">
          <HugeiconsIcon icon={icon} size={18} className="text-[var(--text-dim)]" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-medium text-[var(--text)] truncate">{application.title}</h3>
            {application.installed && (
              <HugeiconsIcon
                icon={CheckmarkCircle01Icon}
                size={13}
                className="text-emerald-400 shrink-0"
              />
            )}
          </div>
          <p className="text-xs text-[var(--text-dim)] mt-1 leading-relaxed">{application.summary}</p>
        </div>
      </div>

      <div className="mt-4 flex items-center gap-2 pt-1">
        {application.installed && application.url ? (
          <a
            href={application.url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--rail)] px-3 py-1.5 text-xs text-[var(--text)] hover:bg-[var(--surface-2)] transition-colors"
          >
            Open
            <HugeiconsIcon icon={ArrowUpRight01Icon} size={12} />
          </a>
        ) : null}

        {application.installed && !application.url ? (
          <span className="text-[11px] text-[var(--text-dim)]">Installed — no console</span>
        ) : null}

        {!application.installed && application.installable && (
          <Button
            type="button"
            size="sm"
            onClick={() => onInstall(application.id)}
            disabled={!canInstall || running}
            className="gap-1.5"
          >
            <HugeiconsIcon icon={Download01Icon} size={13} />
            {running ? 'Installing…' : 'Install'}
          </Button>
        )}
      </div>
    </div>
  );
}
