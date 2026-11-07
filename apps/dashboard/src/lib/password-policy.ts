/**
 * The password policy — the same rule the API enforces.
 *
 * The API is the one that decides; this is here so the form can say what is
 * wrong before a request is sent. The rule is ≥12 characters with an upper
 * case letter, a lower case letter and a number — the API's
 * `auth-password-policy.ts`, mirrored.
 */
export const PASSWORD_MIN_LENGTH = 12;

export const PASSWORD_POLICY_MESSAGE =
  `Use at least ${PASSWORD_MIN_LENGTH} characters, with an uppercase letter, a lowercase letter and a number`;

const HAS_UPPER = /[A-Z]/;
const HAS_LOWER = /[a-z]/;
const HAS_NUMBER = /[0-9]/;

/** What is missing, in the order a person would fix it. */
export function passwordProblems(password: string): string[] {
  const problems: string[] = [];
  if (password.length < PASSWORD_MIN_LENGTH) {
    problems.push(`At least ${PASSWORD_MIN_LENGTH} characters`);
  }
  if (!HAS_UPPER.test(password)) problems.push('An uppercase letter');
  if (!HAS_LOWER.test(password)) problems.push('A lowercase letter');
  if (!HAS_NUMBER.test(password)) problems.push('A number');
  return problems;
}

export function isPasswordAcceptable(password: string): boolean {
  return passwordProblems(password).length === 0;
}
