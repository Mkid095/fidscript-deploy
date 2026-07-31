'use client';

import { Badge, Spinner } from '@fidscript/ui';

interface FunctionStatusBadgeProps {
  status: string;
  acting?: string | null;
  logStream?: boolean;
}

const STATUS_VARIANT: Record<string, 'success' | 'warning' | 'danger' | 'info' | 'default'> = {
  ACTIVE: 'success',
  BUILDING: 'warning',
  DEPLOYING: 'warning',
  PENDING: 'info',
  FAILED: 'danger',
  INACTIVE: 'default',
};

const STATUS_LABEL: Record<string, string> = {
  ACTIVE: 'Active',
  BUILDING: 'Building',
  DEPLOYING: 'Deploying',
  PENDING: 'Pending',
  FAILED: 'Failed',
  INACTIVE: 'Inactive',
};

export function FunctionStatusBadge({ status, acting, logStream }: FunctionStatusBadgeProps) {
  const variant = STATUS_VARIANT[status] ?? 'default';
  const label = STATUS_LABEL[status] ?? status;

  return (
    <Badge variant={variant} className="flex items-center gap-1.5">
      {acting ? (
        <Spinner size="sm" />
      ) : logStream ? (
        <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
      ) : null}
      {label}
    </Badge>
  );
}
