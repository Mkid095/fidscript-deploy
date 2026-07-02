import { STEPS, TERMINAL_STEP_KEYS } from './status-utils';

export type DeploymentStep = (typeof STEPS)[number];
export { STEPS, TERMINAL_STEP_KEYS };
