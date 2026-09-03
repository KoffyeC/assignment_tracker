/**
 * Shared test helpers.
 *
 * `createFakeBackend` stands in for `localStorage` under Node and can be handed
 * a preloaded (or deliberately corrupt) payload, which is how the storage tests
 * exercise the malformed-data recovery paths.
 */

/**
 * @param {Record<string, string>} [initial] raw string values, keyed as stored.
 * @returns {{getItem: Function, setItem: Function, removeItem: Function,
 *            raw: Map<string, string>, failWrites: boolean}}
 */
export function createFakeBackend(initial = {}) {
  const raw = new Map(Object.entries(initial));

  return {
    raw,
    /** Flip to true to simulate a quota-exceeded browser. */
    failWrites: false,
    getItem(key) {
      return raw.has(key) ? raw.get(key) : null;
    },
    setItem(key, value) {
      if (this.failWrites) throw new Error('QuotaExceededError');
      raw.set(key, String(value));
    },
    removeItem(key) {
      raw.delete(key);
    },
  };
}

/**
 * A valid assignment input, overridable per test.
 * @param {object} [overrides]
 * @returns {object}
 */
export function assignmentInput(overrides = {}) {
  return {
    name: 'Project #2',
    class: 'Coding 3',
    dueDate: '2026-09-05',
    priority: 'High',
    ...overrides,
  };
}

/**
 * A valid note input, overridable per test.
 * @param {object} [overrides]
 * @returns {object}
 */
export function noteInput(overrides = {}) {
  return {
    title: 'Coding 3 Study Guide',
    content: 'Review loops, recursion, and sorting algorithms.',
    ...overrides,
  };
}

/**
 * A fixed "now" so date assertions never depend on the day the suite runs.
 * Local noon avoids any chance of a timezone shifting the calendar day.
 * @returns {Date}
 */
export function fixedNow() {
  return new Date(2026, 8, 3, 12, 0, 0); // 3 September 2026, local time
}
