import test from 'node:test';
import assert from 'node:assert/strict';

import {
  DEFAULT_PRIORITY,
  PRIORITIES,
  isValidPriority,
  normalizePriority,
  priorityCssClass,
  prioritySortRank,
} from '../js/priority.js';

test('exactly three priorities exist, with the design labels', () => {
  assert.deepEqual(PRIORITIES, ['High', 'Medium', 'Low']);
  assert.equal(DEFAULT_PRIORITY, 'Medium', 'Medium is the default shown in the design');
});

test('isValidPriority accepts only the exact labels', () => {
  assert.equal(isValidPriority('High'), true);
  assert.equal(isValidPriority('Medium'), true);
  assert.equal(isValidPriority('Low'), true);

  assert.equal(isValidPriority('high'), false, 'casing must match exactly');
  assert.equal(isValidPriority('Urgent'), false);
  assert.equal(isValidPriority(''), false);
  assert.equal(isValidPriority(null), false);
  assert.equal(isValidPriority(1), false);
});

test('normalizePriority repairs loose stored values', () => {
  assert.equal(normalizePriority('high'), 'High');
  assert.equal(normalizePriority('  MEDIUM '), 'Medium');
  assert.equal(normalizePriority('low'), 'Low');
  assert.equal(normalizePriority('Critical'), null);
  assert.equal(normalizePriority(undefined), null);
});

test('priorityCssClass gives one badge class per priority', () => {
  assert.equal(priorityCssClass('High'), 'badge--high');
  assert.equal(priorityCssClass('Medium'), 'badge--medium');
  assert.equal(priorityCssClass('Low'), 'badge--low');
});

test('priorityCssClass falls back to the default rather than returning nothing', () => {
  assert.equal(priorityCssClass('bogus'), 'badge--medium');
  assert.equal(priorityCssClass(null), 'badge--medium');
});

test('prioritySortRank puts High first and unknown values last', () => {
  assert.ok(prioritySortRank('High') < prioritySortRank('Medium'));
  assert.ok(prioritySortRank('Medium') < prioritySortRank('Low'));
  assert.ok(prioritySortRank('Low') < prioritySortRank('bogus'));
});
