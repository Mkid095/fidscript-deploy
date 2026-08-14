/**
 * Domain detail tab hooks — re-exported from individual hook files.
 * Split from the original 231-line file to comply with the 150-line ANPAS limit.
 */
export { useDomainHealth } from './domain-health-hook';
export { useDnsRecords } from './domain-dns-records-hook';
export { useDomainEmail } from './domain-email-hook';
export { useDomainRepairs } from './domain-repairs-hook';
export { useDomainOverview } from './domain-overview-hook';
export { useDomainSsl } from './domain-ssl-hook';
export { useDomainWizard } from './domain-wizard-hook';
