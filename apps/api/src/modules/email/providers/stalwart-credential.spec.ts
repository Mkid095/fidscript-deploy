import { parseJmapCredential } from './stalwart-credential';

/**
 * The mail server's credential.
 *
 * The installer writes it as `user:hash`. Handed over whole, the password
 * went out as `admin:<hash>` and the mail server answered 401 for a
 * credential that was right.
 */

const HASH = 'bdcb9efadb3f6542276695581c6aefd97722b372004435c197ca4ac5a090ccf0';

describe("the mail server's credential", () => {
  it('is split into its user and its secret', () => {
    expect(parseJmapCredential('', `admin:${HASH}`)).toEqual({ user: 'admin', pass: HASH });
  });

  it('keeps a configured user', () => {
    expect(parseJmapCredential('operator', `admin:${HASH}`)).toEqual({
      user: 'operator',
      pass: HASH,
    });
  });

  it('is used as it is when it carries no user', () => {
    expect(parseJmapCredential('', HASH)).toEqual({ user: 'admin', pass: HASH });
  });

  it('does not split a secret that merely contains a colon', () => {
    expect(parseJmapCredential('', 'a:secret:with:colons')).toEqual({
      user: 'admin',
      pass: 'a:secret:with:colons',
    });
  });
});
