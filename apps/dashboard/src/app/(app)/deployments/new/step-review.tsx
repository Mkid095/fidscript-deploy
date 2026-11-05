'use client';

import { Card } from '@fidscript/ui';

import type { BuildPlan, EnvVarEntry, ImportSource } from './new-deployment-types';

interface StepReviewProps {
  source: ImportSource;
  repoFullName: string;
  branch: string;
  projectName: string;
  workspaceName: string;
  rootDirectory: string;
  buildPlan: BuildPlan | null;
  envVars: EnvVarEntry[];
  projectId: string;
}

/**
 * Step three — what is about to happen, in one place.
 *
 * Everything the operator chose, and everything the platform worked out, so
 * there is nothing to discover after the build has already started.
 */
export function StepReview(props: StepReviewProps) {
  const rows = [
    { label: 'Source', value: props.source === 'github' ? `GitHub · ${props.repoFullName}` : props.source === 'git' ? `Git · ${props.repoFullName}` : 'Uploaded archive' },
    { label: 'Branch', value: props.branch },
    { label: 'Project', value: props.projectName },
    { label: 'Workspace', value: props.workspaceName },
    { label: 'Root directory', value: props.rootDirectory || 'The top of the repository' },
    { label: 'Preset', value: props.buildPlan ? `${props.buildPlan.frameworkLabel}${props.buildPlan.frameworkVersion ? ` ${props.buildPlan.frameworkVersion}` : ''}` : 'Not detected' },
  ];

  return (
    <div className="space-y-5">
      <Card className="border border-[var(--rail)] p-5">
        <h2 className="text-sm font-semibold text-[var(--text)] mb-3">Ready to deploy</h2>
        <dl className="space-y-2">
          {rows.map(row => (
            <div key={row.label} className="flex items-start justify-between gap-6">
              <dt className="text-xs text-[var(--text-muted)] shrink-0">{row.label}</dt>
              <dd className="text-xs text-[var(--text)] font-mono text-right truncate">{row.value}</dd>
            </div>
          ))}
        </dl>
      </Card>

      <Card className="border border-[var(--rail)] p-5">
        <h2 className="text-sm font-semibold text-[var(--text)] mb-1">Environment variables</h2>
        <p className="text-xs text-[var(--text-muted)] mb-3">
          {props.envVars.length === 0
            ? 'None. The application runs without any.'
            : `${props.envVars.length} saved on the project before the build starts.`}
        </p>
        {props.envVars.length > 0 && (
          <ul className="space-y-1">
            {props.envVars.map(entry => (
              <li key={entry.key} className="flex items-center gap-2 text-xs">
                <span className="font-mono text-[var(--text-muted)]">{entry.key}</span>
                {entry.required && (
                  <span className="px-1.5 py-0.5 rounded text-[10px] uppercase tracking-wider border border-[var(--warning)]/40 text-[var(--warning)]">
                    Required
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
