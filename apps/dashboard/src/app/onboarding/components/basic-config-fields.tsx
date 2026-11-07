'use client';

import { FormField, inputClassName } from '@fidscript/ui';

interface BasicConfigFieldsProps {
  platformName: string;
  domain: string;
  adminEmail: string;
  domainError: string | null;
  emailError: string | null;
  validating: boolean;
  onPlatformNameChange: (value: string) => void;
  onDomainChange: (value: string) => void;
  onAdminEmailChange: (value: string) => void;
  onAdminEmailBlur: (value: string) => void;
}

export function BasicConfigFields({
  platformName,
  domain,
  adminEmail,
  domainError,
  emailError,
  validating,
  onPlatformNameChange,
  onDomainChange,
  onAdminEmailChange,
  onAdminEmailBlur,
}: BasicConfigFieldsProps) {
  return (
    <>
      <FormField label="Platform name">
        {(props) => (
          <input
            {...props}
            type="text"
            value={platformName}
            onChange={e => onPlatformNameChange(e.target.value)}
            className={inputClassName}
          />
        )}
      </FormField>
      <FormField
        label="Platform domain"
        loading={validating}
        error={domainError}
        success={!domainError && domain ? 'Looks good' : null}
      >
        {(props) => (
          <input
            {...props}
            type="text"
            value={domain}
            onChange={e => onDomainChange(e.target.value)}
            placeholder="deploy.example.com"
            className={inputClassName}
          />
        )}
      </FormField>
      <FormField label="Administrator email" error={emailError}>
        {(props) => (
          <input
            {...props}
            type="email"
            value={adminEmail}
            onChange={e => { onAdminEmailChange(e.target.value); }}
            onBlur={e => { if (e.target.value) onAdminEmailBlur(e.target.value); }}
            placeholder="admin@example.com"
            className={inputClassName}
          />
        )}
      </FormField>
    </>
  );
}
