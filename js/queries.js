/**
 * Business logic: selecting, ordering and summarising records.
 *
 * Pure functions over plain arrays — no storage access and no DOM access — so
 * the Dashboard, Assignments and Notes pages all derive their views from one
 * shared definition of "upcoming", "completed" and "recent".
 */

import { daysUntil, parseISODate } from './date-utils.js';
import { prioritySortRank } from './priority.js';

/**
 * Incomplete assignments, soonest due date first.
 *
 * Completion status alone decides membership here; an overdue assignment is
 * still upcoming until the student actually marks it complete.
 *
 * @param {object[]} assignments
 * @returns {object[]} a new sorted array; the input is not mutated.
 */
export function upcomingAssignments(assignments) {
  return toArray(assignments)
    .filter((item) => item.completed !== true)
    .sort(compareByDueDate);
}

/**
 * Completed assignments, most recently updated first, so an assignment just
 * ticked off appears at the top of the Completed list.
 *
 * @param {object[]} assignments
 * @returns {object[]}
 */
export function completedAssignments(assignments) {
  return toArray(assignments)
    .filter((item) => item.completed === true)
    .sort((a, b) => timestampValue(b.updatedAt) - timestampValue(a.updatedAt));
}

/**
 * Notes ordered by most recent edit.
 *
 * @param {object[]} notes
 * @param {number} [limit] optional cap, used by Dashboard Recent Notes.
 * @returns {object[]}
 */
export function recentNotes(notes, limit) {
  const sorted = toArray(notes).sort(
    (a, b) => timestampValue(b.updatedAt) - timestampValue(a.updatedAt),
  );
  return typeof limit === 'number' && limit >= 0 ? sorted.slice(0, limit) : sorted;
}

/**
 * Count assignments per due date, for the dashboard calendar widget's dots.
 *
 * @param {object[]} assignments
 * @returns {Map<string, number>} ISO date -> number of assignments due.
 */
export function assignmentCountsByDueDate(assignments) {
  const counts = new Map();
  for (const item of toArray(assignments)) {
    if (parseISODate(item.dueDate) === null) continue;
    counts.set(item.dueDate, (counts.get(item.dueDate) ?? 0) + 1);
  }
  return counts;
}

/**
 * Group assignments by their due-date string for the full Calendar page.
 * The original records are preserved and each date's list is sorted by
 * priority, then title, so the Calendar agrees with the rest of the planner.
 *
 * @param {object[]} assignments
 * @param {{includeCompleted?: boolean}} [options]
 * @returns {Map<string, object[]>}
 */
export function assignmentsByDueDate(assignments, options = {}) {
  const includeCompleted = options.includeCompleted !== false;
  const grouped = new Map();

  for (const item of toArray(assignments)) {
    if (parseISODate(item.dueDate) === null) continue;
    if (!includeCompleted && item.completed === true) continue;

    const items = grouped.get(item.dueDate) ?? [];
    items.push(item);
    grouped.set(item.dueDate, items);
  }

  for (const items of grouped.values()) {
    items.sort((a, b) => {
      const priorityDiff = prioritySortRank(a.priority) - prioritySortRank(b.priority);
      return priorityDiff !== 0 ? priorityDiff : String(a.name).localeCompare(String(b.name));
    });
  }
  return grouped;
}

/**
 * Every distinct class name already in use, alphabetically.
 *
 * Feeds the Class field's suggestion list so a student can pick a class they
 * have used before without any separate class-management feature.
 *
 * @param {object[]} assignments
 * @returns {string[]}
 */
export function knownClasses(assignments) {
  const names = new Set();
  for (const item of toArray(assignments)) {
    if (typeof item.class === 'string' && item.class.trim() !== '') names.add(item.class.trim());
  }
  return [...names].sort((a, b) => a.localeCompare(b));
}

/**
 * Shorten note content for a card preview.
 *
 * Returns a NEW string; the saved note is never altered by previewing it.
 * Newlines collapse to spaces so a preview stays on its two lines.
 *
 * @param {unknown} content
 * @param {number} [maxLength]
 * @returns {string}
 */
export function notePreview(content, maxLength = 140) {
  if (typeof content !== 'string') return '';
  const flattened = content.replace(/\s+/g, ' ').trim();
  if (flattened.length <= maxLength) return flattened;

  const clipped = flattened.slice(0, maxLength);
  // Prefer breaking at a space so the preview does not end mid-word, but only
  // if that space is late enough to leave a useful amount of text.
  const lastSpace = clipped.lastIndexOf(' ');
  const cutoff = lastSpace > maxLength * 0.6 ? lastSpace : clipped.length;
  return `${clipped.slice(0, cutoff).trimEnd()}…`;
}

/**
 * Sort comparator: nearest due date first, then High before Low, then by name
 * so the order is stable for assignments that tie on both.
 *
 * @param {object} a
 * @param {object} b
 * @returns {number}
 */
function compareByDueDate(a, b) {
  const dayDiff = (daysUntil(a.dueDate) ?? Infinity) - (daysUntil(b.dueDate) ?? Infinity);
  if (dayDiff !== 0) return dayDiff;

  const priorityDiff = prioritySortRank(a.priority) - prioritySortRank(b.priority);
  if (priorityDiff !== 0) return priorityDiff;

  return String(a.name).localeCompare(String(b.name));
}

/**
 * @param {unknown} timestamp
 * @returns {number} epoch ms, or 0 when unreadable so it sorts last.
 */
function timestampValue(timestamp) {
  const value = new Date(timestamp).getTime();
  return Number.isNaN(value) ? 0 : value;
}

/**
 * @param {unknown} value
 * @returns {object[]} a defensive copy, or [] for anything that is not a list.
 */
function toArray(value) {
  return Array.isArray(value) ? value.slice() : [];
}
