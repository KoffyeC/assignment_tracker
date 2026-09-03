/**
 * Assignment and Note record shapes, plus the normalizers that guard every
 * read out of storage.
 *
 * Normalizing on read is what keeps a hand-edited or half-written localStorage
 * value from crashing a page: anything that cannot be repaired into a valid
 * record is dropped rather than rendered.
 */

import { isValidISODate } from './date-utils.js';
import { DEFAULT_PRIORITY, normalizePriority } from './priority.js';

/** Upper bounds, applied so one enormous paste cannot fill the storage quota. */
export const LIMITS = Object.freeze({
  assignmentName: 120,
  className: 80,
  noteTitle: 120,
  noteContent: 20000,
});

/**
 * Generate a stable unique id. Records are never identified by title, so two
 * assignments named "Project #2" remain independently editable and deletable.
 * @returns {string}
 */
export function newId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  // Fallback for older browsers: timestamp plus randomness is enough here
  // because ids only need to be unique within one browser profile.
  return `id-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

/** @returns {string} current time as an ISO timestamp. */
export function nowTimestamp() {
  return new Date().toISOString();
}

/**
 * Repair one raw value from storage into a valid Assignment.
 *
 * @param {unknown} raw
 * @returns {{id: string, name: string, class: string, dueDate: string,
 *            priority: string, completed: boolean,
 *            createdAt: string, updatedAt: string}|null}
 */
export function normalizeAssignment(raw) {
  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) return null;

  const id = readId(raw.id);
  const name = readText(raw.name, LIMITS.assignmentName);
  // `class` is the documented field name; `course` is accepted as an alias so a
  // record written under either convention still loads.
  const className = readText(raw.class ?? raw.course, LIMITS.className);
  const dueDate = typeof raw.dueDate === 'string' ? raw.dueDate : '';

  // Identity, name and a real calendar due date are the minimum a record needs
  // to be renderable anywhere in Sections 1-3.
  if (id === null || name === '' || !isValidISODate(dueDate)) return null;

  const createdAt = readTimestamp(raw.createdAt) ?? nowTimestamp();
  return {
    id,
    name,
    class: className,
    dueDate,
    priority: normalizePriority(raw.priority) ?? DEFAULT_PRIORITY,
    completed: raw.completed === true,
    createdAt,
    // A record saved before updatedAt existed falls back to its creation time
    // rather than to "now", which would fake a recent edit.
    updatedAt: readTimestamp(raw.updatedAt) ?? createdAt,
  };
}

/**
 * Repair one raw value from storage into a valid Note.
 *
 * @param {unknown} raw
 * @returns {{id: string, title: string, content: string,
 *            createdAt: string, updatedAt: string}|null}
 */
export function normalizeNote(raw) {
  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) return null;

  const id = readId(raw.id);
  const title = readText(raw.title, LIMITS.noteTitle);
  if (id === null || title === '') return null;

  // Content is preserved verbatim apart from the length cap: newlines and
  // leading indentation are part of what the student typed.
  const content =
    typeof raw.content === 'string' ? raw.content.slice(0, LIMITS.noteContent) : '';

  const createdAt = readTimestamp(raw.createdAt) ?? nowTimestamp();
  return {
    id,
    title,
    content,
    createdAt,
    updatedAt: readTimestamp(raw.updatedAt) ?? createdAt,
  };
}

/**
 * @param {unknown} value
 * @returns {string|null}
 */
function readId(value) {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
}

/**
 * @param {unknown} value
 * @param {number} maxLength
 * @returns {string}
 */
function readText(value, maxLength) {
  if (typeof value !== 'string') return '';
  return value.trim().slice(0, maxLength);
}

/**
 * @param {unknown} value
 * @returns {string|null} a usable ISO timestamp, or null when unreadable.
 */
function readTimestamp(value) {
  if (typeof value === 'string' && value !== '' && !Number.isNaN(new Date(value).getTime())) {
    return value;
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    return new Date(value).toISOString();
  }
  return null;
}
