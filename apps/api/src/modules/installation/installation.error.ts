export const INSTALLATION_STEPS = ['dns', 'proxy', 'certificate', 'email', 'health'] as const;
export type InstallationStep = typeof INSTALLATION_STEPS[number];

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
