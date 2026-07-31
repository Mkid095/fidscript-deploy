'use client';

import { HugeiconsIcon } from '@hugeicons/react';
import { LockPasswordIcon, Mail01Icon } from '@hugeicons/core-free-icons';
import { Badge } from '@fidscript/ui';

type AuthMethod = 'PASSWORD' | 'MAGIC_CODE';

interface PlatformAuthBadgeProps {
  method: AuthMethod;
}

export function PlatformAuthBadge({ method }: PlatformAuthBadgeProps) {
  const isPassword = method === 'PASSWORD';
  return (
    <div className="mb-6">
      <Badge variant={isPassword ? 'accent' : 'warning'}>
        <HugeiconsIcon icon={isPassword ? LockPasswordIcon : Mail01Icon} size={12} />
        Platform auth: {isPassword ? 'Password' : 'Magic code'}
      </Badge>
    </div>
  );
}
