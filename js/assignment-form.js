/**
 * Section 2 — Add / Edit Assignment form controller.
 *
 * One form serves both modes. `?id=` switches it to edit, where the record is
 * updated in place so the id survives and no second assignment is created.
 */

import { storage } from './storage.js';
import { knownClasses } from './queries.js';
import { validateAssignmentInput } from './validation.js';
import { DEFAULT_PRIORITY, PRIORITIES } from './priority.js';
import {
  el,
  getQueryParam,
  getReturnTarget,
  render,
  setFieldError,
  setFormMessage,
} from './dom.js';

const FIELDS = ['name', 'class', 'dueDate', 'priority'];

const form = document.getElementById('assignment-form');
const saveButton = document.getElementById('save-button');
const backLink = document.getElementById('back-link');
const cancelLink = document.getElementById('cancel-link');
const heading = document.getElementById('page-heading');

/** Guards against a double submit from a fast second click or Enter press. */
let isSubmitting = false;

init();

function init() {
  const returnTarget = getReturnTarget('assignments.html');
  // Back and Cancel both leave without saving, and both land where the user
  // came from rather than guessing.
  backLink.setAttribute('href', returnTarget);
  cancelLink.setAttribute('href', returnTarget);

  populateClassSuggestions();
  clearErrorsWhileTyping();

  const id = getQueryParam('id');
  if (id === null) {
    setMode('Add Assignment', 'Save Assignment');
    document.getElementById('priority').value = DEFAULT_PRIORITY;
    form.addEventListener('submit', (event) => handleSubmit(event, null));
    return;
  }

  const assignment = storage.getAssignmentById(id);
  if (assignment === null) {
    // Unknown or tampered id: say so plainly instead of silently creating a
    // new record the user did not ask for.
    setMode('Edit Assignment', 'Save Assignment');
    setFormMessage('form-message', 'That assignment could not be found. It may have been deleted.');
    form.hidden = true;
    return;
  }

  setMode('Edit Assignment', 'Save Changes');
  prefill(assignment);
  form.addEventListener('submit', (event) => handleSubmit(event, assignment.id));
}

/**
 * @param {string} title
 * @param {string} saveLabel
 */
function setMode(title, saveLabel) {
  document.title = `${title} · Student Planner`;
  heading.textContent = title;
  backLink.textContent = `← ${title}`;
  saveButton.textContent = saveLabel;
}

/** @param {object} assignment */
function prefill(assignment) {
  document.getElementById('name').value = assignment.name;
  document.getElementById('class').value = assignment.class;
  document.getElementById('dueDate').value = assignment.dueDate;
  document.getElementById('priority').value = PRIORITIES.includes(assignment.priority)
    ? assignment.priority
    : DEFAULT_PRIORITY;
}

/**
 * Drop a field's error as soon as the student edits it, so a message never
 * contradicts what is now in the box. It is re-checked on the next submit.
 */
function clearErrorsWhileTyping() {
  for (const field of FIELDS) {
    document.getElementById(field).addEventListener('input', () => setFieldError(field, ''));
  }
}

/** Offer classes the student has already used as native input suggestions. */
function populateClassSuggestions() {
  const datalist = document.getElementById('class-options');
  render(
    datalist,
    knownClasses(storage.getAssignments()).map((name) => el('option', { value: name })),
  );
}

/**
 * @param {SubmitEvent} event
 * @param {string|null} editingId null in add mode.
 */
function handleSubmit(event, editingId) {
  event.preventDefault();
  if (isSubmitting) return;

  const input = {
    name: document.getElementById('name').value,
    class: document.getElementById('class').value,
    dueDate: document.getElementById('dueDate').value,
    priority: document.getElementById('priority').value,
  };

  clearErrors();

  const { valid, errors } = validateAssignmentInput(input);
  if (!valid) {
    showErrors(errors);
    return;
  }

  setSubmitting(true);
  const result =
    editingId === null ? storage.createAssignment(input) : storage.updateAssignment(editingId, input);

  if (!result.ok) {
    // The save genuinely failed: stay on the form so nothing is lost, and do
    // not navigate away as though it had worked.
    setSubmitting(false);
    setFormMessage('form-message', result.error);
    return;
  }

  window.location.href = getReturnTarget('assignments.html');
}

/** @param {boolean} active */
function setSubmitting(active) {
  isSubmitting = active;
  saveButton.disabled = active;
  saveButton.classList.toggle('is-loading', active);
}

function clearErrors() {
  setFormMessage('form-message', '');
  for (const field of FIELDS) setFieldError(field, '');
}

/** @param {Record<string, string>} errors */
function showErrors(errors) {
  for (const [field, message] of Object.entries(errors)) setFieldError(field, message);

  // Move focus to the first problem so keyboard users are taken straight to it.
  const firstInvalid = FIELDS.find((field) => field in errors);
  if (firstInvalid !== undefined) document.getElementById(firstInvalid).focus();
}
