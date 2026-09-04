/**
 * Lightweight session state for this local-only project.
 * There is no password or account backend; logging out simply closes the
 * planner session until the student chooses to continue from the login screen.
 */

export const SESSION_KEY = 'studentPlanner.session.v1';

export function createSession(backend) {
  function isSignedOut() {
    try {
      return backend.getItem(SESSION_KEY) === 'signed-out';
    } catch {
      return false;
    }
  }

  function signOut() {
    try {
      backend.setItem(SESSION_KEY, 'signed-out');
      return true;
    } catch {
      return false;
    }
  }

  function signIn() {
    try {
      backend.setItem(SESSION_KEY, 'active');
      return true;
    } catch {
      return false;
    }
  }

  return { isSignedOut, signOut, signIn };
}

function createMemoryBackend() {
  const values = new Map();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => void values.set(key, String(value)),
  };
}

function resolveBackend() {
  try {
    if (typeof sessionStorage === 'undefined') return createMemoryBackend();
    return sessionStorage;
  } catch {
    return createMemoryBackend();
  }
}

export const session = createSession(resolveBackend());
