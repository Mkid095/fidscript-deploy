'use client';

import { FormField, formInputClass } from './form-field';

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
        <input
          type="text"
          value={platformName}
          onChange={e => onPlatformNameChange(e.target.value)}
          className={formInputClass}
        />
      </FormField>
      <FormField
        label="Platform domain"
        loading={validating}
        successIcon={!validating && !!domain && !domainError}
        error={domainError}
        success={!domainError && domain ? 'Looks good' : null}
      >
        <input
          type="text"
          value={domain}
          onChange={e => onDomainChange(e.target.value)}
          placeholder="deploy.example.com"
          className={formInputClass}
        />
      </FormField>
      <FormField label="Administrator email" error={emailError}>
        <input
          type="email"
          value={adminEmail}
          onChange={e => { onAdminEmailChange(e.target.value); }}
          onBlur={e => { if (e.target.value) onAdminEmailBlur(e.target.value); }}
          placeholder="admin@example.com"
          className={formInputClass}
        />
      </FormField>
    </>
  );
}
