import { registerDecorator, ValidationArguments, ValidationOptions } from 'class-validator';

/**
 * The password policy — ONE rule, used everywhere a password is set.
 *
 * There were three: registration accepted anything at all, a password reset
 * wanted eight characters, and a password change wanted twelve with an upper
 * case letter, a lower case letter and a number. The dashboard enforced the
 * third one in the browser and the server enforced the first — so a person
 * could sign up with a one-character password, and the browser's rule was the
 * only thing standing between an API client and one too.
 *
 * The rule is the strongest of the three, and it is the server's rule: the
 * browser may check it before a request is sent, but the server is what
 * decides.
 */
export const PASSWORD_MIN_LENGTH = 12;
export const PASSWORD_PATTERN = /(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])/;

export const PASSWORD_POLICY_MESSAGE =
  `Password must be at least ${PASSWORD_MIN_LENGTH} characters, with an uppercase letter, a lowercase letter and a number`;

/** Whether a password satisfies the policy. */
export function isPasswordAcceptable(password: string): boolean {
  return password.length >= PASSWORD_MIN_LENGTH && PASSWORD_PATTERN.test(password);
}

/**
 * The class-validator decorator for the policy.
 *
 * Used by every DTO that carries a password, so the three of them cannot
 * drift apart again.
 */
export function IsStrongPassword(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string): void {
    registerDecorator({
      name: 'isStrongPassword',
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: {
        validate: (value: unknown) => typeof value === 'string' && isPasswordAcceptable(value),
        defaultMessage: (args: ValidationArguments) => PASSWORD_POLICY_MESSAGE,
      },
    });
  };
}
