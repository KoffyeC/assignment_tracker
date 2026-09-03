import test from 'node:test';
import assert from 'node:assert/strict';

import { createSession, SESSION_KEY } from '../js/session.js';
import { createFakeBackend } from './helpers.js';

test('a new local session starts active for backward compatibility', () => {
  const session = createSession(createFakeBackend());
  assert.equal(session.isSignedOut(), false);
});

test('logout closes the session until the student signs in again', () => {
  const backend = createFakeBackend();
  const session = createSession(backend);

  assert.equal(session.signOut(), true);
  assert.equal(session.isSignedOut(), true);
  assert.equal(backend.getItem(SESSION_KEY), 'signed-out');

  assert.equal(session.signIn(), true);
  assert.equal(session.isSignedOut(), false);
});
