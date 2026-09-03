/**
 * Section 3 — Notes page controller.
 *
 * Renders saved notes as cards in the two-column grid, newest edit first.
 */

import { storage } from './storage.js';
import { notePreview, recentNotes } from './queries.js';
import { formatUpdatedAbsolute } from './date-utils.js';
import { el, emptyState, render, setFormMessage } from './dom.js';

const grid = document.getElementById('notes-grid');

/** Blocks a second delete click for the same note. */
const busyIds = new Set();

renderPage();

function renderPage() {
  const notes = recentNotes(storage.getNotes());

  if (notes.length === 0) {
    // The empty state replaces the grid entirely so no stray column gap shows.
    grid.classList.remove('notes-grid');
    render(grid, [emptyState('You have no notes yet. Select “+ Add Note” to write your first one.')]);
    return;
  }

  grid.classList.add('notes-grid');
  render(
    grid,
    notes.map((note) => noteCard(note)),
  );
}

/**
 * @param {object} note
 * @returns {HTMLElement}
 */
function noteCard(note) {
  const preview = notePreview(note.content);

  return el('article', { class: 'card note-card' }, [
    el('h2', { class: 'note-card__title wrap-anywhere', text: note.title }),
    el('p', { class: 'note-card__meta', text: formatUpdatedAbsolute(note.updatedAt) }),
    el('p', {
      class: preview === '' ? 'note-card__preview note-card__preview--empty' : 'note-card__preview wrap-anywhere',
      // textContent via `text`, so note bodies containing markup render as the
      // literal characters the student typed.
      text: preview === '' ? 'No content yet.' : preview,
    }),
    el('div', { class: 'note-card__actions' }, [
      el('a', {
        class: 'btn-link',
        href: `note-form.html?id=${encodeURIComponent(note.id)}&return=notes.html`,
        'aria-label': `Edit ${note.title}`,
        text: '✎ Edit',
      }),
      el('button', {
        class: 'btn-link btn-link--muted',
        type: 'button',
        'aria-label': `Delete ${note.title}`,
        text: 'Delete',
        onClick: () => remove(note),
      }),
    ]),
  ]);
}

/** @param {object} note */
function remove(note) {
  if (busyIds.has(note.id)) return;
  if (!window.confirm(`Delete "${note.title}"? This cannot be undone.`)) return;

  busyIds.add(note.id);
  const result = storage.deleteNote(note.id);
  busyIds.delete(note.id);

  if (!result.ok) {
    setFormMessage('page-message', result.error);
    return;
  }
  setFormMessage('page-message', '');
  renderPage();
}
