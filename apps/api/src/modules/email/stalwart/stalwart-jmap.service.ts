// Backwards-compatible re-export — all logic moved to focused services.
// Consumers should migrate to importing from the specific service files.
export { StalwartJmapService } from './stalwart-core.service';
export { StalwartAccountService } from '@/modules/email/stalwart/stalwart-account.service';
export { StalwartIdentityService } from '@/modules/email/stalwart/stalwart-identity.service';
export { StalwartSieveService } from '@/modules/email/stalwart/stalwart-sieve.service';
