import test from 'node:test';
import assert from 'node:assert/strict';

import {
  assignmentCountsByDueDate,
  assignmentsByDueDate,
  completedAssignments,
  knownClasses,
  notePreview,
  recentNotes,
  upcomingAssignments,
} from '../js/queries.js';
import { todayISODate, toISODate } from '../js/date-utils.js';

/**
 * Build an assignment relative to today, so ordering assertions stay true
 * whenever the suite is run.
 * @param {object} fields
 * @returns {object}
 */
function assignmentDueInDays(days, fields = {}) {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + days);
  return {
    id: fields.id ?? `id-${days}`,
    name: fields.name ?? `Assignment ${days}`,
    class: fields.class ?? 'Coding 3',
    dueDate: toISODate(date),
    priority: fields.priority ?? 'Medium',
    completed: fields.completed ?? false,
    createdAt: '2026-09-01T10:00:00.000Z',
    updatedAt: fields.updatedAt ?? '2026-09-01T10:00:00.000Z',
  };
}

test('upcomingAssignments keeps only incomplete records', () => {
  const list = [
    assignmentDueInDays(2, { id: 'a' }),
    assignmentDueInDays(3, { id: 'b', completed: true }),
  ];
  assert.deepEqual(
    upcomingAssignments(list).map((item) => item.id),
    ['a'],
  );
});

test('upcomingAssignments orders by nearest due date', () => {
  const list = [
    assignmentDueInDays(9, { id: 'far' }),
    assignmentDueInDays(2, { id: 'near' }),
    assignmentDueInDays(5, { id: 'mid' }),
  ];
  assert.deepEqual(
    upcomingAssignments(list).map((item) => item.id),
    ['near', 'mid', 'far'],
  );
});

test('upcomingAssignments still lists an overdue assignment, soonest-first', () => {
  const list = [assignmentDueInDays(1, { id: 'tomorrow' }), assignmentDueInDays(-3, { id: 'late' })];
  assert.deepEqual(
    upcomingAssignments(list).map((item) => item.id),
    ['late', 'tomorrow'],
    'overdue work stays upcoming until it is marked complete',
  );
});

test('upcomingAssignments breaks a due-date tie by priority then name', () => {
  const list = [
    assignmentDueInDays(2, { id: 'low', priority: 'Low', name: 'A' }),
    assignmentDueInDays(2, { id: 'high', priority: 'High', name: 'Z' }),
    assignmentDueInDays(2, { id: 'medium', priority: 'Medium', name: 'M' }),
  ];
  assert.deepEqual(
    upcomingAssignments(list).map((item) => item.id),
    ['high', 'medium', 'low'],
  );
});

test('upcomingAssignments does not mutate its input', () => {
  const list = [assignmentDueInDays(9, { id: 'far' }), assignmentDueInDays(2, { id: 'near' })];
  upcomingAssignments(list);
  assert.equal(list[0].id, 'far', 'the caller-owned array must be untouched');
});

test('completedAssignments keeps only completed records, newest edit first', () => {
  const list = [
    assignmentDueInDays(1, { id: 'open' }),
    assignmentDueInDays(2, { id: 'older', completed: true, updatedAt: '2026-09-01T10:00:00.000Z' }),
    assignmentDueInDays(3, { id: 'newer', completed: true, updatedAt: '2026-09-02T10:00:00.000Z' }),
  ];
  assert.deepEqual(
    completedAssignments(list).map((item) => item.id),
    ['newer', 'older'],
  );
});

test('assignment selection handles empty and non-array input', () => {
  for (const input of [[], null, undefined, 'nope']) {
    assert.deepEqual(upcomingAssignments(input), []);
    assert.deepEqual(completedAssignments(input), []);
  }
});

test('recentNotes orders by updatedAt and honours a limit', () => {
  const notes = [
    { id: 'a', title: 'A', content: '', updatedAt: '2026-08-29T10:00:00.000Z' },
    { id: 'b', title: 'B', content: '', updatedAt: '2026-08-31T10:00:00.000Z' },
    { id: 'c', title: 'C', content: '', updatedAt: '2026-08-30T10:00:00.000Z' },
  ];
  assert.deepEqual(
    recentNotes(notes).map((n) => n.id),
    ['b', 'c', 'a'],
  );
  assert.deepEqual(
    recentNotes(notes, 2).map((n) => n.id),
    ['b', 'c'],
  );
});

test('recentNotes sorts an unreadable timestamp last instead of throwing', () => {
  const notes = [
    { id: 'broken', title: 'X', content: '', updatedAt: 'not-a-date' },
    { id: 'good', title: 'Y', content: '', updatedAt: '2026-08-31T10:00:00.000Z' },
  ];
  assert.deepEqual(
    recentNotes(notes).map((n) => n.id),
    ['good', 'broken'],
  );
});

test('assignmentCountsByDueDate groups several assignments on one date', () => {
  const shared = todayISODate();
  const counts = assignmentCountsByDueDate([
    { id: 'a', dueDate: shared },
    { id: 'b', dueDate: shared },
    { id: 'c', dueDate: '2026-12-25' },
  ]);
  assert.equal(counts.get(shared), 2);
  assert.equal(counts.get('2026-12-25'), 1);
});

test('assignmentCountsByDueDate skips records with an unusable date', () => {
  const counts = assignmentCountsByDueDate([
    { id: 'a', dueDate: '2026-02-30' },
    { id: 'b', dueDate: null },
  ]);
  assert.equal(counts.size, 0);
});

test('assignmentsByDueDate groups every assignment and can hide completed work', () => {
  const dueDate = todayISODate();
  const open = assignmentDueInDays(0, { id: 'open', name: 'Open', priority: 'Low' });
  const urgent = assignmentDueInDays(0, { id: 'urgent', name: 'Urgent', priority: 'High' });
  const done = assignmentDueInDays(0, { id: 'done', completed: true });

  assert.deepEqual(
    assignmentsByDueDate([open, done, urgent]).get(dueDate).map((item) => item.id),
    ['urgent', 'done', 'open'],
  );
  assert.deepEqual(
    assignmentsByDueDate([open, done, urgent], { includeCompleted: false })
      .get(dueDate)
      .map((item) => item.id),
    ['urgent', 'open'],
  );
});

test('knownClasses lists each class once, alphabetically', () => {
  const classes = knownClasses([
    { class: 'Coding 3' },
    { class: 'Accounting' },
    { class: 'Coding 3' },
    { class: '   ' },
    { class: null },
  ]);
  assert.deepEqual(classes, ['Accounting', 'Coding 3']);
});

test('notePreview returns short content unchanged', () => {
  assert.equal(notePreview('Short note.'), 'Short note.');
});

test('notePreview flattens newlines so a card preview stays on its lines', () => {
  assert.equal(notePreview('Line one.\nLine two.'), 'Line one. Line two.');
});

test('notePreview truncates on a word boundary and marks the cut', () => {
  const content = 'alpha bravo charlie delta echo foxtrot golf hotel india juliet kilo lima';
  const preview = notePreview(content, 30);

  assert.ok(preview.length <= 31, `preview was ${preview.length} characters`);
  assert.ok(preview.endsWith('…'));
  assert.ok(!preview.slice(0, -1).endsWith(' '), 'no dangling space before the ellipsis');
  assert.ok(content.startsWith(preview.slice(0, -1)), 'the preview is a true prefix');
});

test('notePreview never alters the saved content', () => {
  const content = 'a'.repeat(500);
  const copy = content;
  notePreview(content);
  assert.equal(content, copy);
});

test('notePreview returns text, not markup, for HTML-like content', () => {
  const preview = notePreview('<script>alert("x")</script> plain tail');
  assert.equal(preview, '<script>alert("x")</script> plain tail');
});

test('notePreview handles non-string input', () => {
  assert.equal(notePreview(null), '');
  assert.equal(notePreview(undefined), '');
  assert.equal(notePreview(42), '');
});
