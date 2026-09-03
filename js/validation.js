/**
 * Form validation for the Assignment and Note forms.
 *
 * Pure functions: they take plain input objects and return field-keyed error
 * messages. They never touch the DOM, so they are unit-testable and both forms
 * share exactly one definition of "valid".
 */

import { isValidISODate } from './date-utils.js';
import { isValidPriority, PRIORITIES } from './priority.js';
import { LIMITS } from './models.js';

/**
 * @typedef {{valid: boolean, errors: Record<string, string>}} ValidationResult
 */

/**
 * @param {{name?: unknown, class?: unknown, dueDate?: unknown, priority?: unknown}} input
 * @returns {ValidationResult}
 */
export function validateAssignmentInput(input) {
  /** @type {Record<string, string>} */
  const errors = {};
  const source = input ?? {};

  const name = asString(source.name);
  if (name === '') {
    errors.name = 'Assignment name is required.';
  } else if (name.length > LIMITS.assignmentName) {
    errors.name = `Assignment name must be ${LIMITS.assignmentName} characters or fewer.`;
  }

  const className = asString(source.class);
  if (className === '') {
    errors.class = 'Class is required.';
  } else if (className.length > LIMITS.className) {
    errors.class = `Class must be ${LIMITS.className} characters or fewer.`;
  }

  const dueDate = asString(source.dueDate);
  if (dueDate === '') {
    errors.dueDate = 'Due date is required.';
  } else if (!isValidISODate(dueDate)) {
    errors.dueDate = 'Enter a valid due date.';
  }

  if (!isValidPriority(source.priority)) {
    errors.priority = `Priority must be ${PRIORITIES.join(', ')}.`;
  }

  return { valid: Object.keys(errors).length === 0, errors };
}

/**
 * Notes require a title. Empty content is allowed on purpose: a student may
 * want to save a heading first and fill it in later.
 *
 * @param {{title?: unknown, content?: unknown}} input
 * @returns {ValidationResult}
 */
export function validateNoteInput(input) {
  /** @type {Record<string, string>} */
  const errors = {};
  const source = input ?? {};

  const title = asString(source.title);
  if (title === '') {
    errors.title = 'Note title is required.';
  } else if (title.length > LIMITS.noteTitle) {
    errors.title = `Note title must be ${LIMITS.noteTitle} characters or fewer.`;
  }

  const content = typeof source.content === 'string' ? source.content : '';
  if (content.length > LIMITS.noteContent) {
    errors.content = `Note content must be ${LIMITS.noteContent} characters or fewer.`;
  }

  return { valid: Object.keys(errors).length === 0, errors };
}

/**
 * @param {unknown} value
 * @returns {string}
 */
function asString(value) {
  return typeof value === 'string' ? value.trim() : '';
}
