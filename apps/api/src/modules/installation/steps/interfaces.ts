import { StepValidationIssue, StepResult } from '../dto';

export interface Validator<S = unknown> {
  validate(input: S): Promise<StepValidationIssue>;
}

export interface Executor<S = unknown, R = unknown> {
  execute(input: S): Promise<R>;
}

export interface Step<S = unknown, R = unknown> {
  name: string;
  validate(input: S): Promise<StepValidationIssue>;
  execute(input: S): Promise<StepResult>;
}
