/**
 * Domain detail tab hooks — barrel re-export.
 * The original 231-line file has been split into individual hook files in [domainId]/
 * to comply with the 150-line ANPAS limit.
 */
export { useDomainHealth } from './[domainId]/domain-health-hook';
export { useDnsRecords } from './[domainId]/domain-dns-records-hook';
export { useDomainEmail } from './[domainId]/domain-email-hook';
export { useDomainRepairs } from './[domainId]/domain-repairs-hook';
export { useDomainOverview } from './[domainId]/domain-overview-hook';
export { useDomainSsl } from './[domainId]/domain-ssl-hook';
export { useDomainWizard } from './[domainId]/domain-wizard-hook';
