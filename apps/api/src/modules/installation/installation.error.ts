export type InstallationStep = 'dns' | 'proxy' | 'certificate' | 'email' | 'health';

/**
 * Thrown by installation step executors when a step fails.
 * Carries the step name as a typed field — no string parsing needed.
 */
export class InstallationStepError extends Error {
  constructor(
    public readonly step: InstallationStep,
    message: string,
  ) {
    super(message);
    this.name = 'InstallationStepError';
  }
}
