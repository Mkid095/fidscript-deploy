// Backwards-compatible re-export — all logic moved to focused services.
// Consumers should migrate to importing from the specific service files.
export { StalwartJmapService } from './stalwart-core.service';
export { StalwartAccountService } from './stalwart-account.service';
export { StalwartIdentityService } from './stalwart-identity.service';
export { StalwartSieveService } from './stalwart-sieve.service';
