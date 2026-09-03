/**
 * The one and only persistence layer for Sections 1-3.
 *
 * No other file may call `localStorage` directly. Every page reads and writes
 * assignments and notes through the `storage` singleton exported at the bottom,
 * which is what keeps the Dashboard, Assignments and Notes pages showing the
 * same records instead of drifting apart.
 *
 * Every mutation returns a result object rather than throwing, so a caller can
 * tell a real success from a quota-exceeded write and never reports a failed
 * save as if it had worked.
 */

import {
  newId,
  normalizeAssignment,
  normalizeNote,
  nowTimestamp,
} from './models.js';

/**
 * Versioned storage keys. Documented for Programmer 2: the Calendar page can
 * read assignment due dates from `assignments` without adding a second data
 * system. Bump the `.vN` suffix if the record shape ever changes.
 */
export const STORAGE_KEYS = Object.freeze({
  assignments: 'studentPlanner.assignments.v1',
  notes: 'studentPlanner.notes.v1',
  quickNote: 'studentPlanner.quickNote.v1',
});

/**
 * @typedef {{ok: true, record: object}} SuccessResult
 * @typedef {{ok: false, error: string}} FailureResult
 */

/**
 * Build a storage API bound to a Web Storage-like backend.
 *
 * Injecting the backend is what makes this module testable under Node, where
 * there is no `localStorage`.
 *
 * @param {{getItem(k: string): string|null, setItem(k: string, v: string): void,
 *          removeItem(k: string): void}} backend
 */
export function createStorage(backend) {
  /* ------------------------------------------------------------------ */
  /* Low-level read/write                                                */
  /* ------------------------------------------------------------------ */

  /**
   * Read a list, discarding anything that cannot be repaired.
   *
   * Missing key, invalid JSON, a non-array value, and individual broken records
   * all degrade to "as much valid data as we have" instead of an exception.
   *
   * @param {string} key
   * @param {(raw: unknown) => object|null} normalize
   * @returns {object[]}
   */
  function readList(key, normalize) {
    let raw;
    try {
      raw = backend.getItem(key);
    } catch {
      return [];
    }
    if (raw === null || raw === '') return [];

    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return [];
    }
    if (!Array.isArray(parsed)) return [];

    const records = [];
    const seenIds = new Set();
    for (const item of parsed) {
      const record = normalize(item);
      // Duplicate ids would make edit and delete ambiguous, so the first
      // occurrence wins and later collisions are dropped.
      if (record !== null && !seenIds.has(record.id)) {
        seenIds.add(record.id);
        records.push(record);
      }
    }
    return records;
  }

  /**
   * @param {string} key
   * @param {unknown} value
   * @returns {boolean} false when the write failed (e.g. quota exceeded).
   */
  function write(key, value) {
    try {
      backend.setItem(key, JSON.stringify(value));
      return true;
    } catch {
      return false;
    }
  }

  /* ------------------------------------------------------------------ */
  /* Assignments                                                         */
  /* ------------------------------------------------------------------ */

  /** @returns {object[]} every saved assignment, newest storage order. */
  function getAssignments() {
    return readList(STORAGE_KEYS.assignments, normalizeAssignment);
  }

  /**
   * @param {unknown} id
   * @returns {object|null} null for a missing or invalid id.
   */
  function getAssignmentById(id) {
    if (typeof id !== 'string' || id === '') return null;
    return getAssignments().find((item) => item.id === id) ?? null;
  }

  /**
   * @param {object} input validated assignment fields.
   * @returns {SuccessResult|FailureResult}
   */
  function createAssignment(input) {
    const timestamp = nowTimestamp();
    const record = normalizeAssignment({
      ...input,
      id: newId(),
      completed: input?.completed === true,
      createdAt: timestamp,
      updatedAt: timestamp,
    });
    if (record === null) {
      return { ok: false, error: 'Assignment could not be saved because it is incomplete.' };
    }

    const next = [...getAssignments(), record];
    return write(STORAGE_KEYS.assignments, next)
      ? { ok: true, record }
      : { ok: false, error: 'Assignment could not be saved. Your browser storage may be full.' };
  }

  /**
   * Update an existing assignment in place, preserving its id and createdAt so
   * no second record is ever produced by an edit.
   *
   * @param {string} id
   * @param {object} patch
   * @returns {SuccessResult|FailureResult}
   */
  function updateAssignment(id, patch) {
    const assignments = getAssignments();
    const index = assignments.findIndex((item) => item.id === id);
    if (index === -1) return { ok: false, error: 'That assignment no longer exists.' };

    const existing = assignments[index];
    const record = normalizeAssignment({
      ...existing,
      ...patch,
      id: existing.id,
      createdAt: existing.createdAt,
      updatedAt: nowTimestamp(),
    });
    if (record === null) {
      return { ok: false, error: 'Assignment could not be saved because it is incomplete.' };
    }

    assignments[index] = record;
    return write(STORAGE_KEYS.assignments, assignments)
      ? { ok: true, record }
      : { ok: false, error: 'Assignment could not be saved. Your browser storage may be full.' };
  }

  /**
   * Flip completion on the existing record. Deliberately not a "create a
   * completed copy" operation: the id and every other field survive.
   *
   * @param {string} id
   * @param {boolean} completed
   * @returns {SuccessResult|FailureResult}
   */
  function setAssignmentCompleted(id, completed) {
    return updateAssignment(id, { completed: completed === true });
  }

  /**
   * @param {string} id
   * @returns {SuccessResult|FailureResult}
   */
  function deleteAssignment(id) {
    const assignments = getAssignments();
    const target = assignments.find((item) => item.id === id);
    if (target === undefined) return { ok: false, error: 'That assignment no longer exists.' };

    const next = assignments.filter((item) => item.id !== id);
    return write(STORAGE_KEYS.assignments, next)
      ? { ok: true, record: target }
      : { ok: false, error: 'Assignment could not be deleted. Please try again.' };
  }

  /* ------------------------------------------------------------------ */
  /* Notes                                                               */
  /* ------------------------------------------------------------------ */

  /** @returns {object[]} every saved note. */
  function getNotes() {
    return readList(STORAGE_KEYS.notes, normalizeNote);
  }

  /**
   * @param {unknown} id
   * @returns {object|null}
   */
  function getNoteById(id) {
    if (typeof id !== 'string' || id === '') return null;
    return getNotes().find((item) => item.id === id) ?? null;
  }

  /**
   * @param {object} input validated note fields.
   * @returns {SuccessResult|FailureResult}
   */
  function createNote(input) {
    const timestamp = nowTimestamp();
    const record = normalizeNote({
      ...input,
      id: newId(),
      createdAt: timestamp,
      updatedAt: timestamp,
    });
    if (record === null) {
      return { ok: false, error: 'Note could not be saved because it is incomplete.' };
    }

    const next = [...getNotes(), record];
    return write(STORAGE_KEYS.notes, next)
      ? { ok: true, record }
      : { ok: false, error: 'Note could not be saved. Your browser storage may be full.' };
  }

  /**
   * Update a note in place. `updatedAt` moves only here, on a successful save,
   * never when a form is merely opened or cancelled.
   *
   * @param {string} id
   * @param {object} patch
   * @returns {SuccessResult|FailureResult}
   */
  function updateNote(id, patch) {
    const notes = getNotes();
    const index = notes.findIndex((item) => item.id === id);
    if (index === -1) return { ok: false, error: 'That note no longer exists.' };

    const existing = notes[index];
    const record = normalizeNote({
      ...existing,
      ...patch,
      id: existing.id,
      createdAt: existing.createdAt,
      updatedAt: nowTimestamp(),
    });
    if (record === null) {
      return { ok: false, error: 'Note could not be saved because it is incomplete.' };
    }

    notes[index] = record;
    return write(STORAGE_KEYS.notes, notes)
      ? { ok: true, record }
      : { ok: false, error: 'Note could not be saved. Your browser storage may be full.' };
  }

  /**
   * Delete a note and drop any Quick Note that pointed at it, so the Dashboard
   * never renders a reference to a record that is gone.
   *
   * @param {string} id
   * @returns {SuccessResult|FailureResult}
   */
  function deleteNote(id) {
    const notes = getNotes();
    const target = notes.find((item) => item.id === id);
    if (target === undefined) return { ok: false, error: 'That note no longer exists.' };

    const next = notes.filter((item) => item.id !== id);
    if (!write(STORAGE_KEYS.notes, next)) {
      return { ok: false, error: 'Note could not be deleted. Please try again.' };
    }

    const quickNote = getQuickNote();
    if (quickNote !== null && quickNote.noteId === id) clearQuickNote();

    return { ok: true, record: target };
  }

  /* ------------------------------------------------------------------ */
  /* Quick Note (Dashboard card, display-only)                           */
  /* ------------------------------------------------------------------ */

  /**
   * Read the Quick Note. A Quick Note that points at a deleted note is treated
   * as absent rather than rendered as a dangling reference.
   *
   * @returns {{text: string, noteId: string|null}|null}
   */
  function getQuickNote() {
    let raw;
    try {
      raw = backend.getItem(STORAGE_KEYS.quickNote);
    } catch {
      return null;
    }
    if (raw === null || raw === '') return null;

    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return null;
    }
    if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) return null;

    const text = typeof parsed.text === 'string' ? parsed.text.trim() : '';
    const noteId = typeof parsed.noteId === 'string' && parsed.noteId !== '' ? parsed.noteId : null;
    if (text === '') return null;

    return { text, noteId };
  }

  /**
   * Save the Quick Note shown on the Dashboard.
   *
   * Exposed so the content can come from real state rather than being hard
   * coded into the Dashboard markup. No editor UI is built for it here.
   *
   * @param {string} text
   * @param {string|null} [noteId] optional link to the note it came from.
   * @returns {SuccessResult|FailureResult}
   */
  function setQuickNote(text, noteId = null) {
    const value = typeof text === 'string' ? text.trim() : '';
    if (value === '') return clearQuickNote();

    const record = { text: value, noteId: typeof noteId === 'string' ? noteId : null };
    return write(STORAGE_KEYS.quickNote, record)
      ? { ok: true, record }
      : { ok: false, error: 'Quick note could not be saved.' };
  }

  /** @returns {SuccessResult|FailureResult} */
  function clearQuickNote() {
    try {
      backend.removeItem(STORAGE_KEYS.quickNote);
      return { ok: true, record: { text: '', noteId: null } };
    } catch {
      return { ok: false, error: 'Quick note could not be cleared.' };
    }
  }

  return {
    getAssignments,
    getAssignmentById,
    createAssignment,
    updateAssignment,
    setAssignmentCompleted,
    deleteAssignment,
    getNotes,
    getNoteById,
    createNote,
    updateNote,
    deleteNote,
    getQuickNote,
    setQuickNote,
    clearQuickNote,
  };
}

/**
 * An in-memory stand-in used when Web Storage is unavailable — private browsing
 * in some browsers, or a Node test importing this module. The app stays usable
 * for the session; only persistence across reloads is lost.
 *
 * @returns {{getItem: Function, setItem: Function, removeItem: Function}}
 */
function createMemoryBackend() {
  const map = new Map();
  return {
    getItem: (key) => (map.has(key) ? map.get(key) : null),
    setItem: (key, value) => void map.set(key, String(value)),
    removeItem: (key) => void map.delete(key),
  };
}

/**
 * Resolve the real backend. The probe write matters because Safari's private
 * mode exposes `localStorage` but throws on every `setItem`.
 */
function resolveBackend() {
  try {
    if (typeof localStorage === 'undefined') return createMemoryBackend();
    const probeKey = '__studentPlannerProbe__';
    localStorage.setItem(probeKey, '1');
    localStorage.removeItem(probeKey);
    return localStorage;
  } catch {
    return createMemoryBackend();
  }
}

/** The shared instance every page imports. */
export const storage = createStorage(resolveBackend());
