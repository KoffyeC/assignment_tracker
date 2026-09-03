/**
 * Section 3 — Add / Edit Note form controller.
 *
 * The same form serves both modes. `updatedAt` moves only on a successful
 * save: opening the form, or leaving it via Back or Cancel, never touches it.
 */

import { storage } from './storage.js';
import { validateNoteInput } from './validation.js';
import { getQueryParam, getReturnTarget, setFieldError, setFormMessage } from './dom.js';

const FIELDS = ['title', 'content'];

const form = document.getElementById('note-form');
const saveButton = document.getElementById('save-button');
const backLink = document.getElementById('back-link');
const cancelLink = document.getElementById('cancel-link');
const heading = document.getElementById('page-heading');

let isSubmitting = false;

init();

function init() {
  const returnTarget = getReturnTarget('notes.html');
  backLink.setAttribute('href', returnTarget);
  cancelLink.setAttribute('href', returnTarget);

  // Drop a field's error as soon as the student edits it, so a message never
  // contradicts what is now in the box. It is re-checked on the next submit.
  for (const field of FIELDS) {
    document.getElementById(field).addEventListener('input', () => setFieldError(field, ''));
  }

  const id = getQueryParam('id');
  if (id === null) {
    setMode('Add Note', 'Save Note');
    form.addEventListener('submit', (event) => handleSubmit(event, null));
    return;
  }

  const note = storage.getNoteById(id);
  if (note === null) {
    setMode('Edit Note', 'Save Changes');
    setFormMessage('form-message', 'That note could not be found. It may have been deleted.');
    form.hidden = true;
    return;
  }

  setMode('Edit Note', 'Save Changes');
  // The complete saved content is loaded, not a preview, so editing can never
  // truncate what the student already wrote.
  document.getElementById('title').value = note.title;
  document.getElementById('content').value = note.content;
  form.addEventListener('submit', (event) => handleSubmit(event, note.id));
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

/**
 * @param {SubmitEvent} event
 * @param {string|null} editingId
 */
function handleSubmit(event, editingId) {
  event.preventDefault();
  if (isSubmitting) return;

  const input = {
    title: document.getElementById('title').value,
    // Content keeps its original whitespace and line breaks; only the title is
    // trimmed by validation.
    content: document.getElementById('content').value,
  };

  clearErrors();

  const { valid, errors } = validateNoteInput(input);
  if (!valid) {
    showErrors(errors);
    return;
  }

  setSubmitting(true);
  const result = editingId === null ? storage.createNote(input) : storage.updateNote(editingId, input);

  if (!result.ok) {
    setSubmitting(false);
    setFormMessage('form-message', result.error);
    return;
  }

  window.location.href = getReturnTarget('notes.html');
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

  const firstInvalid = FIELDS.find((field) => field in errors);
  if (firstInvalid !== undefined) document.getElementById(firstInvalid).focus();
}
