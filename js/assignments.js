/**
 * Section 2 — Assignments page controller.
 *
 * Renders the saved assignment records (never placeholder data) into an
 * Upcoming list and a Completed list, and wires Complete / Mark Incomplete /
 * Edit / Delete.
 */

import { storage } from './storage.js';
import { completedAssignments, upcomingAssignments } from './queries.js';
import { formatDaysRemaining, formatDueDate } from './date-utils.js';
import { priorityCssClass } from './priority.js';
import { el, emptyState, render, setFormMessage } from './dom.js';

const activeContainer = document.getElementById('active-assignments');
const completedContainer = document.getElementById('completed-assignments');
const activeCount = document.getElementById('active-count');
const completedCount = document.getElementById('completed-count');

/** Blocks a second click while a mutation for the same record is running. */
const busyIds = new Set();

renderPage();

function renderPage() {
  const assignments = storage.getAssignments();
  const active = upcomingAssignments(assignments);
  const completed = completedAssignments(assignments);

  activeCount.textContent = countLabel(active.length, 'assignment');
  completedCount.textContent = countLabel(completed.length, 'assignment');

  render(activeContainer, [
    active.length === 0
      ? emptyState('No upcoming assignments. Add one to get started.')
      : el(
          'ul',
          { class: 'assignment-list' },
          active.map((item) => activeRow(item)),
        ),
  ]);

  render(completedContainer, [
    completed.length === 0
      ? emptyState('No completed assignments yet.')
      : el(
          'ul',
          { class: 'assignment-list' },
          completed.map((item) => completedRow(item)),
        ),
  ]);
}

/**
 * A row for an incomplete assignment: full detail plus every action.
 * @param {object} assignment
 * @returns {HTMLElement}
 */
function activeRow(assignment) {
  return el('li', { class: 'assignment-row' }, [
    el('div', {}, [
      el('p', { class: 'assignment-row__name wrap-anywhere', text: assignment.name }),
      el('p', { class: 'assignment-row__class wrap-anywhere', text: assignment.class }),
    ]),
    el('div', {}, [
      el('p', { class: 'assignment-row__due', text: `Due ${formatDueDate(assignment.dueDate)}` }),
      el('p', {
        class: 'assignment-row__remaining',
        text: formatDaysRemaining(assignment.dueDate),
      }),
    ]),
    el('div', { class: 'assignment-row__priority' }, [
      el('span', { class: `badge ${priorityCssClass(assignment.priority)}`, text: assignment.priority }),
    ]),
    el('div', { class: 'assignment-row__actions' }, [
      actionButton('Complete', `Mark ${assignment.name} complete`, () =>
        setCompleted(assignment.id, true),
      ),
      editLink(assignment),
      deleteButton(assignment),
    ]),
  ]);
}

/**
 * A row for a completed assignment. No priority badge: the work is done, so the
 * urgency signal would only add noise.
 * @param {object} assignment
 * @returns {HTMLElement}
 */
function completedRow(assignment) {
  return el('li', { class: 'assignment-row assignment-row--completed' }, [
    el('div', {}, [
      el('p', { class: 'assignment-row__name wrap-anywhere' }, [
        el('span', { class: 'assignment-row__check', 'aria-hidden': 'true', text: '✓' }),
        assignment.name,
      ]),
      el('p', { class: 'assignment-row__class wrap-anywhere', text: assignment.class }),
    ]),
    el('div', {}, [
      el('p', { class: 'assignment-row__due', text: `Due ${formatDueDate(assignment.dueDate)}` }),
    ]),
    el('div', { class: 'assignment-row__actions' }, [
      actionButton('Mark Incomplete', `Mark ${assignment.name} incomplete`, () =>
        setCompleted(assignment.id, false),
      ),
      editLink(assignment),
      deleteButton(assignment),
    ]),
  ]);
}

/**
 * @param {string} label
 * @param {string} accessibleName includes the assignment name, so a screen
 *   reader user hears which record the button belongs to.
 * @param {() => void} onClick
 * @returns {HTMLElement}
 */
function actionButton(label, accessibleName, onClick) {
  return el('button', {
    class: 'btn-link',
    type: 'button',
    'aria-label': accessibleName,
    text: label,
    onClick,
  });
}

/** @param {object} assignment @returns {HTMLElement} */
function editLink(assignment) {
  return el('a', {
    class: 'btn-link btn-link--muted',
    href: `assignment-form.html?id=${encodeURIComponent(assignment.id)}&return=assignments.html`,
    'aria-label': `Edit ${assignment.name}`,
    text: 'Edit',
  });
}

/** @param {object} assignment @returns {HTMLElement} */
function deleteButton(assignment) {
  return el('button', {
    class: 'btn-link btn-link--danger',
    type: 'button',
    'aria-label': `Delete ${assignment.name}`,
    text: 'Delete',
    onClick: () => remove(assignment),
  });
}

/**
 * @param {string} id
 * @param {boolean} completed
 */
function setCompleted(id, completed) {
  if (busyIds.has(id)) return;
  busyIds.add(id);

  const result = storage.setAssignmentCompleted(id, completed);
  busyIds.delete(id);

  if (!result.ok) {
    setFormMessage('page-message', result.error);
    return;
  }
  setFormMessage('page-message', '');
  renderPage();
}

/** @param {object} assignment */
function remove(assignment) {
  if (busyIds.has(assignment.id)) return;
  if (!window.confirm(`Delete "${assignment.name}"? This cannot be undone.`)) return;

  busyIds.add(assignment.id);
  const result = storage.deleteAssignment(assignment.id);
  busyIds.delete(assignment.id);

  if (!result.ok) {
    setFormMessage('page-message', result.error);
    return;
  }
  setFormMessage('page-message', '');
  renderPage();
}

/**
 * @param {number} count
 * @param {string} noun
 * @returns {string}
 */
function countLabel(count, noun) {
  return `${count} ${noun}${count === 1 ? '' : 's'}`;
}
