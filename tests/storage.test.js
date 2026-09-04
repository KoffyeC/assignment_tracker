import test from 'node:test';
import assert from 'node:assert/strict';

import { STORAGE_KEYS, createStorage } from '../js/storage.js';
import { assignmentInput, createFakeBackend, noteInput } from './helpers.js';

/* ------------------------------------------------------------------------ */
/* Assignments — create, read, update, complete, delete                      */
/* ------------------------------------------------------------------------ */

test('empty storage returns an empty list rather than throwing', () => {
  const storage = createStorage(createFakeBackend());
  assert.deepEqual(storage.getAssignments(), []);
  assert.deepEqual(storage.getNotes(), []);
  assert.equal(storage.getQuickNote(), null);
});

test('createAssignment saves a complete record with generated metadata', () => {
  const storage = createStorage(createFakeBackend());
  const result = storage.createAssignment(assignmentInput());

  assert.equal(result.ok, true);
  assert.equal(result.record.name, 'Project #2');
  assert.equal(result.record.class, 'Coding 3');
  assert.equal(result.record.dueDate, '2026-09-05');
  assert.equal(result.record.priority, 'High');
  assert.equal(result.record.completed, false);
  assert.ok(result.record.id, 'an id is generated');
  assert.ok(result.record.createdAt);
  assert.ok(result.record.updatedAt);
});

test('createAssignment appends rather than replacing', () => {
  const storage = createStorage(createFakeBackend());
  storage.createAssignment(assignmentInput({ name: 'First' }));
  storage.createAssignment(assignmentInput({ name: 'Second' }));

  assert.equal(storage.getAssignments().length, 2);
});

test('createAssignment rejects input that is not a valid record', () => {
  const storage = createStorage(createFakeBackend());
  const result = storage.createAssignment({ name: '', class: 'X', dueDate: '2026-09-05' });

  assert.equal(result.ok, false);
  assert.ok(result.error);
  assert.equal(storage.getAssignments().length, 0, 'nothing is persisted on failure');
});

test('createAssignment reports failure when the browser refuses to write', () => {
  const backend = createFakeBackend();
  backend.failWrites = true;
  const storage = createStorage(backend);

  const result = storage.createAssignment(assignmentInput());
  assert.equal(result.ok, false, 'a failed save must not look successful');
  assert.match(result.error, /could not be saved/i);
});

test('assignments with identical names stay independently addressable', () => {
  const storage = createStorage(createFakeBackend());
  const first = storage.createAssignment(assignmentInput({ name: 'Project #2' })).record;
  const second = storage.createAssignment(assignmentInput({ name: 'Project #2' })).record;

  assert.notEqual(first.id, second.id, 'duplicate titles must get distinct ids');

  storage.deleteAssignment(first.id);
  const remaining = storage.getAssignments();
  assert.equal(remaining.length, 1);
  assert.equal(remaining[0].id, second.id, 'only the selected record was deleted');
});

test('getAssignmentById handles missing and invalid ids safely', () => {
  const storage = createStorage(createFakeBackend());
  storage.createAssignment(assignmentInput());

  assert.equal(storage.getAssignmentById('does-not-exist'), null);
  assert.equal(storage.getAssignmentById(''), null);
  assert.equal(storage.getAssignmentById(null), null);
  assert.equal(storage.getAssignmentById(undefined), null);
});

test('updateAssignment edits in place, preserving id and createdAt', () => {
  const storage = createStorage(createFakeBackend());
  const created = storage.createAssignment(assignmentInput()).record;

  const result = storage.updateAssignment(created.id, {
    name: 'Project #2 (revised)',
    priority: 'Medium',
    dueDate: '2026-09-11',
  });

  assert.equal(result.ok, true);
  assert.equal(result.record.id, created.id, 'the id is preserved');
  assert.equal(result.record.createdAt, created.createdAt);
  assert.equal(result.record.name, 'Project #2 (revised)');
  assert.equal(result.record.priority, 'Medium');
  assert.equal(result.record.dueDate, '2026-09-11');
  assert.equal(storage.getAssignments().length, 1, 'no second record was created');
});

test('updateAssignment leaves unlisted fields alone', () => {
  const storage = createStorage(createFakeBackend());
  const created = storage.createAssignment(assignmentInput()).record;

  storage.updateAssignment(created.id, { priority: 'Low' });
  const updated = storage.getAssignmentById(created.id);

  assert.equal(updated.name, 'Project #2');
  assert.equal(updated.class, 'Coding 3');
  assert.equal(updated.priority, 'Low');
});

test('updateAssignment refuses an unknown id', () => {
  const storage = createStorage(createFakeBackend());
  const result = storage.updateAssignment('nope', { name: 'X' });

  assert.equal(result.ok, false);
  assert.match(result.error, /no longer exists/i);
});

test('setAssignmentCompleted flips the same record, creating no duplicate', () => {
  const storage = createStorage(createFakeBackend());
  const created = storage.createAssignment(assignmentInput()).record;

  const completed = storage.setAssignmentCompleted(created.id, true);
  assert.equal(completed.ok, true);
  assert.equal(completed.record.completed, true);
  assert.equal(completed.record.id, created.id);
  assert.equal(storage.getAssignments().length, 1);
});

test('setAssignmentCompleted returns a record to incomplete', () => {
  const storage = createStorage(createFakeBackend());
  const created = storage.createAssignment(assignmentInput()).record;

  storage.setAssignmentCompleted(created.id, true);
  const reopened = storage.setAssignmentCompleted(created.id, false);

  assert.equal(reopened.ok, true);
  assert.equal(reopened.record.completed, false);
  assert.equal(reopened.record.id, created.id, 'the original id survives the round trip');
  assert.equal(storage.getAssignments().length, 1);
});

test('repeated complete clicks stay idempotent', () => {
  const storage = createStorage(createFakeBackend());
  const created = storage.createAssignment(assignmentInput()).record;

  storage.setAssignmentCompleted(created.id, true);
  storage.setAssignmentCompleted(created.id, true);
  storage.setAssignmentCompleted(created.id, true);

  const all = storage.getAssignments();
  assert.equal(all.length, 1);
  assert.equal(all[0].completed, true);
});

test('deleteAssignment removes only the target and reports an unknown id', () => {
  const storage = createStorage(createFakeBackend());
  const keep = storage.createAssignment(assignmentInput({ name: 'Keep' })).record;
  const drop = storage.createAssignment(assignmentInput({ name: 'Drop' })).record;

  assert.equal(storage.deleteAssignment(drop.id).ok, true);
  assert.deepEqual(
    storage.getAssignments().map((a) => a.id),
    [keep.id],
  );

  const second = storage.deleteAssignment(drop.id);
  assert.equal(second.ok, false, 'deleting twice does not silently succeed');
});

/* ------------------------------------------------------------------------ */
/* Notes                                                                     */
/* ------------------------------------------------------------------------ */

test('createNote saves title, content and timestamps', () => {
  const storage = createStorage(createFakeBackend());
  const result = storage.createNote(noteInput());

  assert.equal(result.ok, true);
  assert.equal(result.record.title, 'Coding 3 Study Guide');
  assert.equal(result.record.content, 'Review loops, recursion, and sorting algorithms.');
  assert.equal(result.record.createdAt, result.record.updatedAt);
});

test('createNote requires a title but allows empty content', () => {
  const storage = createStorage(createFakeBackend());

  assert.equal(storage.createNote(noteInput({ title: '' })).ok, false);
  assert.equal(storage.createNote(noteInput({ content: '' })).ok, true);
});

test('note content is stored verbatim, including newlines and markup text', () => {
  const storage = createStorage(createFakeBackend());
  const content = 'Line one.\n\n  Indented line.\n<b>not bold</b> & "quoted"';
  const created = storage.createNote(noteInput({ content })).record;

  assert.equal(storage.getNoteById(created.id).content, content);
});

test('updateNote edits in place and moves updatedAt forward', async () => {
  const storage = createStorage(createFakeBackend());
  const created = storage.createNote(noteInput()).record;

  await new Promise((resolve) => setTimeout(resolve, 5));
  const result = storage.updateNote(created.id, { title: 'New Title', content: 'New body' });

  assert.equal(result.ok, true);
  assert.equal(result.record.id, created.id);
  assert.equal(result.record.createdAt, created.createdAt, 'createdAt is fixed');
  assert.ok(
    new Date(result.record.updatedAt) > new Date(created.updatedAt),
    'a successful save advances updatedAt',
  );
  assert.equal(storage.getNotes().length, 1);
});

test('merely reading a note does not change updatedAt', () => {
  const storage = createStorage(createFakeBackend());
  const created = storage.createNote(noteInput()).record;

  storage.getNoteById(created.id);
  storage.getNotes();

  assert.equal(
    storage.getNoteById(created.id).updatedAt,
    created.updatedAt,
    'opening or cancelling an edit must leave the timestamp alone',
  );
});

test('notes with identical titles remain independently editable', () => {
  const storage = createStorage(createFakeBackend());
  const first = storage.createNote(noteInput({ title: 'Study Guide' })).record;
  const second = storage.createNote(noteInput({ title: 'Study Guide' })).record;

  assert.notEqual(first.id, second.id);
  storage.updateNote(second.id, { content: 'only the second changes' });

  assert.equal(storage.getNoteById(first.id).content, noteInput().content);
  assert.equal(storage.getNoteById(second.id).content, 'only the second changes');
});

test('deleteNote removes only the target', () => {
  const storage = createStorage(createFakeBackend());
  const keep = storage.createNote(noteInput({ title: 'Keep' })).record;
  const drop = storage.createNote(noteInput({ title: 'Drop' })).record;

  assert.equal(storage.deleteNote(drop.id).ok, true);
  assert.deepEqual(
    storage.getNotes().map((n) => n.id),
    [keep.id],
  );
  assert.equal(storage.deleteNote(drop.id).ok, false);
});

/* ------------------------------------------------------------------------ */
/* Quick Note                                                                */
/* ------------------------------------------------------------------------ */

test('quick note round-trips through storage', () => {
  const storage = createStorage(createFakeBackend());
  assert.equal(storage.setQuickNote('Review recursion before the quiz!').ok, true);

  assert.deepEqual(storage.getQuickNote(), {
    text: 'Review recursion before the quiz!',
    noteId: null,
  });
});

test('setting empty quick note text clears it', () => {
  const storage = createStorage(createFakeBackend());
  storage.setQuickNote('something');
  storage.setQuickNote('   ');

  assert.equal(storage.getQuickNote(), null);
});

test('deleting the source note clears a quick note that referenced it', () => {
  const storage = createStorage(createFakeBackend());
  const note = storage.createNote(noteInput()).record;
  storage.setQuickNote('From that note', note.id);

  storage.deleteNote(note.id);

  assert.equal(storage.getQuickNote(), null, 'no dangling reference is left behind');
});

test('deleting an unrelated note leaves the quick note intact', () => {
  const storage = createStorage(createFakeBackend());
  const linked = storage.createNote(noteInput({ title: 'Linked' })).record;
  const other = storage.createNote(noteInput({ title: 'Other' })).record;
  storage.setQuickNote('Keep me', linked.id);

  storage.deleteNote(other.id);

  assert.equal(storage.getQuickNote().text, 'Keep me');
});

/* ------------------------------------------------------------------------ */
/* Persistence and corrupt data                                              */
/* ------------------------------------------------------------------------ */

test('data written by one instance is read back by the next (reload)', () => {
  const backend = createFakeBackend();
  const first = createStorage(backend);
  const created = first.createAssignment(assignmentInput()).record;
  first.createNote(noteInput());

  // A fresh instance over the same backend is what a browser refresh does.
  const second = createStorage(backend);
  assert.equal(second.getAssignments().length, 1);
  assert.equal(second.getAssignmentById(created.id).name, 'Project #2');
  assert.equal(second.getNotes().length, 1);
});

test('records are stored under the documented versioned keys', () => {
  const backend = createFakeBackend();
  const storage = createStorage(backend);
  storage.createAssignment(assignmentInput());
  storage.createNote(noteInput());
  storage.setQuickNote('hello');

  assert.ok(backend.raw.has(STORAGE_KEYS.assignments));
  assert.ok(backend.raw.has(STORAGE_KEYS.notes));
  assert.ok(backend.raw.has(STORAGE_KEYS.quickNote));
  assert.equal(STORAGE_KEYS.assignments, 'studentPlanner.assignments.v1');
  assert.equal(STORAGE_KEYS.notes, 'studentPlanner.notes.v1');
  assert.equal(STORAGE_KEYS.quickNote, 'studentPlanner.quickNote.v1');
});

test('planner settings have safe defaults and persist valid values', () => {
  const backend = createFakeBackend();
  const storage = createStorage(backend);

  assert.deepEqual(storage.getSettings(), {
    displayName: '',
    weekStartsOn: 'sunday',
    showCompletedOnCalendar: true,
  });

  const saved = storage.saveSettings({
    displayName: '  Nathan  ',
    weekStartsOn: 'monday',
    showCompletedOnCalendar: false,
  });
  assert.equal(saved.ok, true);
  assert.deepEqual(storage.getSettings(), {
    displayName: 'Nathan',
    weekStartsOn: 'monday',
    showCompletedOnCalendar: false,
  });
  assert.equal(STORAGE_KEYS.settings, 'studentPlanner.settings.v1');
});

test('malformed planner settings fall back without throwing', () => {
  const storage = createStorage(
    createFakeBackend({ [STORAGE_KEYS.settings]: '{broken' }),
  );
  assert.equal(storage.getSettings().weekStartsOn, 'sunday');
});

test('invalid JSON does not crash a read', () => {
  const storage = createStorage(
    createFakeBackend({
      [STORAGE_KEYS.assignments]: '{not json at all',
      [STORAGE_KEYS.notes]: 'null',
      [STORAGE_KEYS.quickNote]: '<<<',
    }),
  );

  assert.deepEqual(storage.getAssignments(), []);
  assert.deepEqual(storage.getNotes(), []);
  assert.equal(storage.getQuickNote(), null);
});

test('a stored value of the wrong shape is ignored', () => {
  const storage = createStorage(
    createFakeBackend({
      [STORAGE_KEYS.assignments]: '{"not":"an array"}',
      [STORAGE_KEYS.notes]: '"a string"',
    }),
  );

  assert.deepEqual(storage.getAssignments(), []);
  assert.deepEqual(storage.getNotes(), []);
});

test('malformed records are dropped while valid neighbours survive', () => {
  const storage = createStorage(
    createFakeBackend({
      [STORAGE_KEYS.assignments]: JSON.stringify([
        { id: 'good', name: 'Real', class: 'Coding 3', dueDate: '2026-09-05', priority: 'High' },
        { id: 'no-name', class: 'Coding 3', dueDate: '2026-09-05' },
        { id: 'bad-date', name: 'Broken', class: 'X', dueDate: '2026-02-30' },
        null,
        'a string',
        42,
      ]),
    }),
  );

  const assignments = storage.getAssignments();
  assert.equal(assignments.length, 1);
  assert.equal(assignments[0].id, 'good');
});

test('an out-of-range stored priority falls back to the default', () => {
  const storage = createStorage(
    createFakeBackend({
      [STORAGE_KEYS.assignments]: JSON.stringify([
        { id: 'a', name: 'X', class: 'Y', dueDate: '2026-09-05', priority: 'Critical' },
      ]),
    }),
  );

  assert.equal(storage.getAssignments()[0].priority, 'Medium');
});

test('a legacy record using "course" instead of "class" still loads', () => {
  const storage = createStorage(
    createFakeBackend({
      [STORAGE_KEYS.assignments]: JSON.stringify([
        { id: 'a', name: 'X', course: 'Accounting', dueDate: '2026-09-05', priority: 'Low' },
      ]),
    }),
  );

  assert.equal(storage.getAssignments()[0].class, 'Accounting');
});

test('duplicate ids in stored data collapse to one record', () => {
  const storage = createStorage(
    createFakeBackend({
      [STORAGE_KEYS.assignments]: JSON.stringify([
        { id: 'dup', name: 'First', class: 'A', dueDate: '2026-09-05', priority: 'High' },
        { id: 'dup', name: 'Second', class: 'B', dueDate: '2026-09-06', priority: 'Low' },
      ]),
    }),
  );

  const assignments = storage.getAssignments();
  assert.equal(assignments.length, 1, 'a duplicate id would make edit and delete ambiguous');
  assert.equal(assignments[0].name, 'First');
});

test('a backend that throws on every read degrades to empty lists', () => {
  const hostile = {
    getItem() {
      throw new Error('SecurityError');
    },
    setItem() {
      throw new Error('SecurityError');
    },
    removeItem() {
      throw new Error('SecurityError');
    },
  };
  const storage = createStorage(hostile);

  assert.deepEqual(storage.getAssignments(), []);
  assert.deepEqual(storage.getNotes(), []);
  assert.equal(storage.getQuickNote(), null);
  assert.equal(storage.createNote(noteInput()).ok, false);
});
