import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';

import { RegisterDto } from './dto/register.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { ConfirmPasswordResetDto } from './dto/verification.dto';
import { PASSWORD_MIN_LENGTH, isPasswordAcceptable } from './auth-password-policy';

/**
 * One password policy, everywhere.
 *
 * There were three: registration accepted anything at all, a reset wanted
 * eight characters, and a change wanted twelve with an upper case letter, a
 * lower case letter and a number. The dashboard enforced the third one in
 * the browser — so the server, which is what actually decides, enforced
 * the first.
 */
describe('the password policy', () => {
  const STRONG = 'A-good-Password-1';

  it('wants twelve characters with an upper case letter, a lower case letter and a number', () => {
    expect(PASSWORD_MIN_LENGTH).toBe(12);
    expect(isPasswordAcceptable(STRONG)).toBe(true);
    expect(isPasswordAcceptable('short')).toBe(false);
    expect(isPasswordAcceptable('alllowercaseletters1')).toBe(false);
    expect(isPasswordAcceptable('ALLUPPERCASELETTERS1')).toBe(false);
    expect(isPasswordAcceptable('NoNumbersHereAtAll')).toBe(false);
  });

  async function errorsFor(cls: any, payload: Record<string, unknown>): Promise<string[]> {
    const instance = plainToInstance(cls, payload);
    const errors = await validate(instance as object);
    return errors.map(e => e.constraints ? Object.values(e.constraints).join(' ') : '');
  }

  it('applies to registration', async () => {
    const errors = await errorsFor(RegisterDto, {
      email: 'operator@fidscript.com',
      password: 'weak',
      authMethod: 'PASSWORD',
    });
    expect(errors.join(' ')).toContain('at least 12 characters');
  });

  it('applies to a password change', async () => {
    const errors = await errorsFor(ChangePasswordDto, {
      currentPassword: 'the-old-one',
      newPassword: 'weak',
    });
    expect(errors.join(' ')).toContain('at least 12 characters');
  });

  it('applies to a password reset', async () => {
    const errors = await errorsFor(ConfirmPasswordResetDto, {
      token: 'abc',
      newPassword: 'weak',
    });
    expect(errors.join(' ')).toContain('at least 12 characters');
  });

  it('lets a strong password through every door', async () => {
    expect(await errorsFor(RegisterDto, {
      email: 'operator@fidscript.com',
      password: STRONG,
      authMethod: 'PASSWORD',
    })).toEqual([]);
    expect(await errorsFor(ChangePasswordDto, {
      currentPassword: 'the-old-one',
      newPassword: STRONG,
    })).toEqual([]);
    expect(await errorsFor(ConfirmPasswordResetDto, {
      token: 'abc',
      newPassword: STRONG,
    })).toEqual([]);
  });

  it('does not ask for a password when there is none', async () => {
    expect(await errorsFor(RegisterDto, {
      email: 'operator@fidscript.com',
      authMethod: 'MAGIC_CODE',
    })).toEqual([]);
  });
});
