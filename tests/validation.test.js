import test from 'node:test';
import assert from 'node:assert/strict';

import { validateAssignmentInput, validateNoteInput } from '../js/validation.js';
import { LIMITS } from '../js/models.js';
import { assignmentInput, noteInput } from './helpers.js';

test('a complete assignment passes validation', () => {
  const result = validateAssignmentInput(assignmentInput());
  assert.equal(result.valid, true);
  assert.deepEqual(result.errors, {});
});

test('assignment name is required', () => {
  const blank = validateAssignmentInput(assignmentInput({ name: '   ' }));
  assert.equal(blank.valid, false);
  assert.match(blank.errors.name, /required/i);

  const missing = validateAssignmentInput(assignmentInput({ name: undefined }));
  assert.equal(missing.valid, false);
});

test('class is required', () => {
  const result = validateAssignmentInput(assignmentInput({ class: '' }));
  assert.equal(result.valid, false);
  assert.match(result.errors.class, /required/i);
});

test('due date must be present and a real calendar date', () => {
  const missing = validateAssignmentInput(assignmentInput({ dueDate: '' }));
  assert.equal(missing.valid, false);
  assert.match(missing.errors.dueDate, /required/i);

  const impossible = validateAssignmentInput(assignmentInput({ dueDate: '2026-02-30' }));
  assert.equal(impossible.valid, false);
  assert.match(impossible.errors.dueDate, /valid/i);
});

test('priority must be exactly High, Medium or Low', () => {
  for (const priority of ['High', 'Medium', 'Low']) {
    assert.equal(validateAssignmentInput(assignmentInput({ priority })).valid, true);
  }
  for (const priority of ['Urgent', 'high', '', null]) {
    assert.equal(
      validateAssignmentInput(assignmentInput({ priority })).valid,
      false,
      `${String(priority)} must be rejected`,
    );
  }
});

test('over-long assignment text is rejected rather than silently truncated', () => {
  const result = validateAssignmentInput(
    assignmentInput({ name: 'x'.repeat(LIMITS.assignmentName + 1) }),
  );
  assert.equal(result.valid, false);
  assert.match(result.errors.name, /characters or fewer/);
});

test('every invalid field reports its own message at once', () => {
  const result = validateAssignmentInput({});
  assert.equal(result.valid, false);
  assert.deepEqual(Object.keys(result.errors).sort(), ['class', 'dueDate', 'name', 'priority']);
});

test('validateAssignmentInput survives null input', () => {
  assert.equal(validateAssignmentInput(null).valid, false);
});

test('a complete note passes validation', () => {
  const result = validateNoteInput(noteInput());
  assert.equal(result.valid, true);
});

test('note title is required', () => {
  const result = validateNoteInput(noteInput({ title: '  ' }));
  assert.equal(result.valid, false);
  assert.match(result.errors.title, /required/i);
});

test('empty note content is allowed', () => {
  assert.equal(validateNoteInput(noteInput({ content: '' })).valid, true);
});

test('over-long note content is rejected', () => {
  const result = validateNoteInput(noteInput({ content: 'x'.repeat(LIMITS.noteContent + 1) }));
  assert.equal(result.valid, false);
  assert.match(result.errors.content, /characters or fewer/);
});
