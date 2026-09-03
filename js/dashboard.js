/**
 * Section 1 — Dashboard controller.
 *
 * Every panel here is derived from the same assignment and note records the
 * Assignments and Notes pages use. There is deliberately no separate dashboard
 * data collection, which is why an edit made anywhere shows up here on reload.
 */

import { storage } from './storage.js';
import { completedAssignments, recentNotes, upcomingAssignments } from './queries.js';
import { formatDaysRemaining, formatDueDate, formatUpdatedRelative } from './date-utils.js';
import { priorityCssClass } from './priority.js';
import { renderCalendarWidget } from './calendar-widget.js';
import { el, emptyState, render } from './dom.js';

/** How many records each summary card shows before "View all". */
const UPCOMING_LIMIT = 5;
const COMPLETED_LIMIT = 4;
const RECENT_NOTES_LIMIT = 3;

renderDashboard();

function renderDashboard() {
  const assignments = storage.getAssignments();
  const notes = storage.getNotes();

  renderGreeting();
  renderUpcoming(assignments);
  render(document.getElementById('calendar-widget'), [renderCalendarWidget(assignments)]);
  renderQuickNote();
  renderCompleted(assignments);
  renderRecentNotes(notes);
}

/** Greeting text follows the local clock. */
function renderGreeting() {
  const hour = new Date().getHours();
  const partOfDay = hour < 12 ? 'morning' : hour < 18 ? 'afternoon' : 'evening';
  document.getElementById('greeting').textContent = `Good ${partOfDay}! 👋`;
}

/** @param {object[]} assignments */
function renderUpcoming(assignments) {
  const upcoming = upcomingAssignments(assignments).slice(0, UPCOMING_LIMIT);
  const container = document.getElementById('upcoming-assignments');

  if (upcoming.length === 0) {
    render(container, [emptyState('Nothing due right now. Add an assignment to see it here.')]);
    return;
  }

  render(container, [
    el(
      'ul',
      { class: 'assignment-list' },
      upcoming.map((assignment) =>
        el('li', { class: 'assignment-row' }, [
          el('div', {}, [
            el('p', { class: 'assignment-row__name wrap-anywhere', text: assignment.name }),
            el('p', { class: 'assignment-row__class wrap-anywhere', text: assignment.class }),
          ]),
          el('div', {}, [
            el('p', {
              class: 'assignment-row__due',
              text: `Due ${formatDueDate(assignment.dueDate)}`,
            }),
            el('p', {
              class: 'assignment-row__remaining',
              text: formatDaysRemaining(assignment.dueDate),
            }),
          ]),
          el('div', { class: 'assignment-row__priority' }, [
            el('span', {
              class: `badge ${priorityCssClass(assignment.priority)}`,
              text: assignment.priority,
            }),
          ]),
        ]),
      ),
    ),
  ]);
}

/**
 * Quick Note card — display only.
 *
 * The content comes from storage rather than being hard coded, and a Quick Note
 * whose source note was deleted is already filtered out by the storage layer,
 * so this never renders a dangling reference.
 */
function renderQuickNote() {
  const quickNote = storage.getQuickNote();
  const container = document.getElementById('quick-note');

  render(container, [
    quickNote === null
      ? emptyState('No quick note saved.')
      : el('p', { class: 'quick-note__body wrap-anywhere', text: quickNote.text }),
  ]);
}

/** @param {object[]} assignments */
function renderCompleted(assignments) {
  const completed = completedAssignments(assignments).slice(0, COMPLETED_LIMIT);
  const container = document.getElementById('completed-assignments');

  if (completed.length === 0) {
    render(container, [emptyState('No completed assignments yet.')]);
    return;
  }

  render(container, [
    el(
      'ul',
      { class: 'summary-list' },
      completed.map((assignment) =>
        el('li', { class: 'summary-row' }, [
          el('p', { class: 'summary-row__label wrap-anywhere' }, [
            el('span', { class: 'assignment-row__check', 'aria-hidden': 'true', text: '✓' }),
            assignment.name,
          ]),
          el('p', { class: 'summary-row__meta wrap-anywhere', text: assignment.class }),
        ]),
      ),
    ),
  ]);
}

/** @param {object[]} notes */
function renderRecentNotes(notes) {
  const recent = recentNotes(notes, RECENT_NOTES_LIMIT);
  const container = document.getElementById('recent-notes');

  if (recent.length === 0) {
    render(container, [emptyState('No notes yet.')]);
    return;
  }

  render(container, [
    el(
      'ul',
      { class: 'summary-list' },
      recent.map((note) =>
        el('li', { class: 'note-summary' }, [
          el('p', { class: 'note-summary__title wrap-anywhere', text: note.title }),
          el('p', { class: 'note-summary__meta', text: formatUpdatedRelative(note.updatedAt) }),
        ]),
      ),
    ),
  ]);
}
