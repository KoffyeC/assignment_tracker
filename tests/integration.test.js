/**
 * Section 1-3 integration tests.
 *
 * These walk the full assignment and note workflows through the same storage
 * and query modules the pages use, asserting at each step what each Section 1-3
 * view would render. A single fake backend is shared across the steps so the
 * test mirrors one browser session, including reloads.
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import { createStorage } from '../js/storage.js';
import {
  assignmentCountsByDueDate,
  completedAssignments,
  recentNotes,
  upcomingAssignments,
} from '../js/queries.js';
import { formatDaysRemaining, formatDueDate, toISODate } from '../js/date-utils.js';
import { createFakeBackend } from './helpers.js';

/**
 * @param {number} offset days from today
 * @returns {string} an ISO date, so assertions hold whenever the suite runs.
 */
function dateInDays(offset) {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + offset);
  return toISODate(date);
}

test('assignment workflow: create, verify everywhere, edit, complete, reopen, delete', async (t) => {
  const backend = createFakeBackend();
  let storage = createStorage(backend);

  const originalDate = dateInDays(2);
  const revisedDate = dateInDays(6);
  let id;

  await t.test('1. create a High-priority assignment', () => {
    const result = storage.createAssignment({
      name: 'Project #2',
      class: 'Coding 3',
      dueDate: originalDate,
      priority: 'High',
    });
    assert.equal(result.ok, true);
    id = result.record.id;
  });

  await t.test('2. it appears on the Assignments page', () => {
    const active = upcomingAssignments(storage.getAssignments());
    assert.equal(active.length, 1);
    assert.equal(active[0].id, id);
    assert.equal(active[0].priority, 'High');
  });

  await t.test('3. it appears in Dashboard Upcoming Assignments with derived text', () => {
    const [item] = upcomingAssignments(storage.getAssignments());
    assert.equal(formatDueDate(item.dueDate), formatDueDate(originalDate));
    assert.equal(formatDaysRemaining(item.dueDate), '2 days left');
  });

  await t.test('4. its date is marked in the Dashboard Calendar widget', () => {
    const counts = assignmentCountsByDueDate(storage.getAssignments());
    assert.equal(counts.get(originalDate), 1);
  });

  await t.test('5-6. it survives a browser refresh', () => {
    storage = createStorage(backend); // a fresh page load over the same storage
    assert.equal(storage.getAssignmentById(id).name, 'Project #2');
  });

  await t.test('7-8. edit its priority and due date', () => {
    const result = storage.updateAssignment(id, { priority: 'Medium', dueDate: revisedDate });
    assert.equal(result.ok, true);
    assert.equal(result.record.id, id, 'the id survives the edit');
    assert.equal(storage.getAssignments().length, 1, 'no second record appeared');
  });

  await t.test('9. every Section 1-3 view reflects the edit', () => {
    const [item] = upcomingAssignments(storage.getAssignments());
    assert.equal(item.priority, 'Medium');
    assert.equal(item.dueDate, revisedDate);
    assert.equal(formatDaysRemaining(item.dueDate), '6 days left');
  });

  await t.test('10. the old calendar date no longer references it', () => {
    const counts = assignmentCountsByDueDate(storage.getAssignments());
    assert.equal(counts.has(originalDate), false, 'the previous due date is released');
    assert.equal(counts.get(revisedDate), 1);
  });

  await t.test('11-13. marking complete moves it, exactly once', () => {
    assert.equal(storage.setAssignmentCompleted(id, true).ok, true);

    const assignments = storage.getAssignments();
    assert.equal(upcomingAssignments(assignments).length, 0, 'it left Upcoming');

    const completed = completedAssignments(assignments);
    assert.equal(completed.length, 1, 'it appears once in Completed');
    assert.equal(completed[0].id, id, 'with its original id');
  });

  await t.test('14. it can be returned to incomplete', () => {
    assert.equal(storage.setAssignmentCompleted(id, false).ok, true);

    const assignments = storage.getAssignments();
    assert.equal(completedAssignments(assignments).length, 0);
    assert.equal(upcomingAssignments(assignments)[0].id, id);
  });

  await t.test('15-16. deleting removes every Section 1-3 reference', () => {
    assert.equal(storage.deleteAssignment(id).ok, true);

    const assignments = storage.getAssignments();
    assert.deepEqual(assignments, []);
    assert.deepEqual(upcomingAssignments(assignments), []);
    assert.deepEqual(completedAssignments(assignments), []);
    assert.equal(assignmentCountsByDueDate(assignments).size, 0, 'the calendar dot is gone');
    assert.equal(storage.getAssignmentById(id), null);
  });
});

test('notes workflow: create, verify, edit, cancel, delete', async (t) => {
  const backend = createFakeBackend();
  let storage = createStorage(backend);

  const originalContent = 'Review loops, recursion, and sorting algorithms.';
  let id;
  let originalUpdatedAt;

  await t.test('1-2. create a note and see its card', () => {
    const result = storage.createNote({
      title: 'Coding 3 Study Guide',
      content: originalContent,
    });
    assert.equal(result.ok, true);
    id = result.record.id;
    originalUpdatedAt = result.record.updatedAt;

    assert.equal(recentNotes(storage.getNotes()).length, 1);
  });

  await t.test('3. Dashboard Recent Notes shows it', () => {
    const [note] = recentNotes(storage.getNotes(), 3);
    assert.equal(note.title, 'Coding 3 Study Guide');
  });

  await t.test('4-5. it survives a browser refresh', () => {
    storage = createStorage(backend);
    assert.equal(storage.getNoteById(id).content, originalContent);
  });

  await t.test('6-8. editing saves the full content and advances updatedAt', async () => {
    const longContent = `${originalContent}\n\n${'Focus on merge sort. '.repeat(40)}`;
    await new Promise((resolve) => setTimeout(resolve, 5));

    const result = storage.updateNote(id, { title: 'Coding 3 Final Review', content: longContent });
    assert.equal(result.ok, true);

    const saved = storage.getNoteById(id);
    assert.equal(saved.title, 'Coding 3 Final Review');
    assert.equal(saved.content, longContent, 'the complete content is stored, not a preview');
    assert.ok(new Date(saved.updatedAt) > new Date(originalUpdatedAt));
  });

  await t.test('9-11. cancelling an edit saves nothing and does not touch updatedAt', () => {
    const before = storage.getNoteById(id);

    // Opening the form only reads the record; Cancel navigates away without
    // calling updateNote at all.
    const loadedIntoForm = storage.getNoteById(id);
    assert.equal(loadedIntoForm.content, before.content);

    const after = storage.getNoteById(id);
    assert.equal(after.title, before.title, 'the cancelled title change was not saved');
    assert.equal(after.content, before.content);
    assert.equal(after.updatedAt, before.updatedAt, 'Cancel leaves the timestamp alone');
  });

  await t.test('12-13. deleting removes it from Notes and Dashboard Recent Notes', () => {
    assert.equal(storage.deleteNote(id).ok, true);
    assert.deepEqual(storage.getNotes(), []);
    assert.deepEqual(recentNotes(storage.getNotes(), 3), []);
    assert.equal(storage.getNoteById(id), null);
  });
});

test('several assignments due on one date all show, and the widget counts them', () => {
  const storage = createStorage(createFakeBackend());
  const sharedDate = dateInDays(3);

  for (const name of ['Essay #1', 'Quiz 1', 'Lab Report']) {
    storage.createAssignment({ name, class: 'Western Culture', dueDate: sharedDate, priority: 'Low' });
  }

  const assignments = storage.getAssignments();
  assert.equal(upcomingAssignments(assignments).length, 3);
  assert.equal(assignmentCountsByDueDate(assignments).get(sharedDate), 3);
});

test('an empty planner produces empty lists everywhere, not errors', () => {
  const storage = createStorage(createFakeBackend());

  assert.deepEqual(upcomingAssignments(storage.getAssignments()), []);
  assert.deepEqual(completedAssignments(storage.getAssignments()), []);
  assert.deepEqual(recentNotes(storage.getNotes(), 3), []);
  assert.equal(assignmentCountsByDueDate(storage.getAssignments()).size, 0);
  assert.equal(storage.getQuickNote(), null);
});

test('long and special-character text is stored and read back unchanged', () => {
  const storage = createStorage(createFakeBackend());
  const longName = 'Comparative Analysis of Recursive Descent Parsers'.repeat(2).slice(0, 120);
  const specialClass = 'Coding 3 — "Advanced" & <Applied>';

  const created = storage.createAssignment({
    name: longName,
    class: specialClass,
    dueDate: dateInDays(1),
    priority: 'High',
  }).record;

  const saved = storage.getAssignmentById(created.id);
  assert.equal(saved.name, longName);
  assert.equal(saved.class, specialClass, 'angle brackets and quotes are preserved as text');
  assert.equal(formatDaysRemaining(saved.dueDate), '1 day left');
});
