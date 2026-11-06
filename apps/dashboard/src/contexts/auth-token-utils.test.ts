import { test } from 'node:test';
import assert from 'node:assert/strict';
import { safeNextRoute } from './auth-token-utils.ts';

/**
 * The login's `next` parameter.
 *
 * The login sends the person wherever `next` says. If that is not checked,
 * a link like `https://fidscript.com/login?next=https://elsewhere.example`
 * turns the platform's own login into a convincing front door for somebody
 * else's site.
 */

test('a path inside the platform is a destination', () => {
  assert.equal(safeNextRoute('/applications'), '/applications');
  assert.equal(safeNextRoute('/projects/kennedy-test/deployments'), '/projects/kennedy-test/deployments');
});

test('another site is not a destination', () => {
  assert.equal(safeNextRoute('https://elsewhere.example'), null);
  assert.equal(safeNextRoute('http://elsewhere.example/app'), null);
  assert.equal(safeNextRoute('javascript:alert(1)'), null);
  assert.equal(safeNextRoute('mailto:someone@example.com'), null);
});

test('a protocol-relative address is not a destination', () => {
  assert.equal(safeNextRoute('//elsewhere.example'), null);
  assert.equal(safeNextRoute('/\\elsewhere.example'), null);
});

test('a backslash is not a destination — a browser reads it as a slash', () => {
  assert.equal(safeNextRoute('/applications\\..\\..\\elsewhere.example'), null);
});

test('nothing at all is not a destination', () => {
  assert.equal(safeNextRoute(null), null);
  assert.equal(safeNextRoute(undefined), null);
  assert.equal(safeNextRoute(''), null);
});
