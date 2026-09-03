/**
 * Date helpers for assignment due dates and note timestamps.
 *
 * Rules that the rest of the app depends on:
 *  - Due dates are stored as plain `YYYY-MM-DD` calendar strings, never as
 *    formatted presentation text and never as a full timestamp.
 *  - Those strings are always parsed to LOCAL midnight. Using `new Date(iso)`
 *    would parse as UTC and shift the assignment onto a neighbouring day for
 *    anyone west of Greenwich, so it is never used here.
 *  - Presentation text ("Due Sep 5", "2 days left") is derived on every render.
 */

const MONTHS_SHORT = Object.freeze([
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
]);

/** Weekday initials for the dashboard calendar widget, Sunday first. */
export const WEEKDAY_INITIALS = Object.freeze(['S', 'M', 'T', 'W', 'T', 'F', 'S']);

/** Full weekday names, used for accessible calendar headers. */
export const WEEKDAY_NAMES = Object.freeze([
  'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday',
]);

const MS_PER_DAY = 86400000;
const ISO_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

/**
 * Validate a stored due date. Rejects impossible calendar dates such as
 * "2026-02-30" and "2026-13-01", which a bare regex would let through.
 * @param {unknown} value
 * @returns {boolean}
 */
export function isValidISODate(value) {
  if (typeof value !== 'string') return false;
  const match = ISO_DATE_PATTERN.exec(value);
  if (!match) return false;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return false;

  // Round-tripping through Date catches Feb 30, Apr 31, and non-leap Feb 29.
  const date = new Date(year, month - 1, day);
  return (
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
  );
}

/**
 * Parse `YYYY-MM-DD` to a Date at LOCAL midnight.
 * @param {unknown} value
 * @returns {Date|null}
 */
export function parseISODate(value) {
  if (!isValidISODate(value)) return null;
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day);
}

/**
 * Format a Date as `YYYY-MM-DD` using its LOCAL calendar fields.
 * @param {Date} date
 * @returns {string}
 */
export function toISODate(date) {
  const year = String(date.getFullYear()).padStart(4, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Local midnight of the reference day. Every "days left" calculation is
 * anchored here so the answer never depends on the current clock time.
 * @param {Date} [now]
 * @returns {Date}
 */
export function startOfDay(now = new Date()) {
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

/** @param {Date} [now] @returns {string} today's date as `YYYY-MM-DD`. */
export function todayISODate(now = new Date()) {
  return toISODate(startOfDay(now));
}

/**
 * Whole days from today until the given due date.
 * Positive = future, 0 = today, negative = overdue.
 *
 * Rounding (rather than flooring) absorbs the 23- and 25-hour days produced by
 * daylight-saving transitions, which would otherwise be off by one.
 *
 * @param {string} isoDate
 * @param {Date} [now]
 * @returns {number|null} null when the date is unparseable.
 */
export function daysUntil(isoDate, now = new Date()) {
  const due = parseISODate(isoDate);
  if (due === null) return null;
  return Math.round((due.getTime() - startOfDay(now).getTime()) / MS_PER_DAY);
}

/**
 * "Due Sep 5" style text. The year is appended only when it differs from the
 * current year, so a date in another year is never ambiguous.
 * @param {string} isoDate
 * @param {Date} [now]
 * @returns {string} "" when the date is unparseable.
 */
export function formatDueDate(isoDate, now = new Date()) {
  const due = parseISODate(isoDate);
  if (due === null) return '';

  const base = `${MONTHS_SHORT[due.getMonth()]} ${due.getDate()}`;
  return due.getFullYear() === now.getFullYear()
    ? base
    : `${base}, ${due.getFullYear()}`;
}

/**
 * Human "time remaining" text. Never renders a negative number of days.
 * @param {string} isoDate
 * @param {Date} [now]
 * @returns {string} "" when the date is unparseable.
 */
export function formatDaysRemaining(isoDate, now = new Date()) {
  const days = daysUntil(isoDate, now);
  if (days === null) return '';

  if (days === 0) return 'Due today';
  if (days === 1) return '1 day left';
  if (days > 1) return `${days} days left`;

  const overdue = Math.abs(days);
  return overdue === 1 ? 'Overdue by 1 day' : `Overdue by ${overdue} days`;
}

/**
 * Absolute "Updated Aug 30" text used on note cards.
 * @param {unknown} timestamp ISO timestamp string or epoch milliseconds.
 * @param {Date} [now]
 * @returns {string} "Updated recently" when the timestamp is unusable.
 */
export function formatUpdatedAbsolute(timestamp, now = new Date()) {
  const date = toDate(timestamp);
  if (date === null) return 'Updated recently';

  const base = `Updated ${MONTHS_SHORT[date.getMonth()]} ${date.getDate()}`;
  return date.getFullYear() === now.getFullYear()
    ? base
    : `${base}, ${date.getFullYear()}`;
}

/**
 * Relative "Updated 1h ago" text used in Dashboard Recent Notes.
 * @param {unknown} timestamp ISO timestamp string or epoch milliseconds.
 * @param {Date} [now]
 * @returns {string}
 */
export function formatUpdatedRelative(timestamp, now = new Date()) {
  const date = toDate(timestamp);
  if (date === null) return 'Updated recently';

  const elapsedMs = now.getTime() - date.getTime();
  if (elapsedMs < 0) return 'Updated recently';

  const hours = Math.floor(elapsedMs / 3600000);
  if (hours < 1) return 'Updated recently';
  if (hours < 24) return `Updated ${hours}h ago`;

  const days = Math.floor(hours / 24);
  if (days === 1) return 'Updated yesterday';
  if (days < 7) return `Updated ${days} days ago`;

  return formatUpdatedAbsolute(timestamp, now);
}

/**
 * Build the day grid for one month of the dashboard calendar widget.
 *
 * Returns whole weeks padded with nulls, so the first of the month always
 * lands under its real weekday and short/long months both render correctly.
 *
 * @param {number} year
 * @param {number} monthIndex 0-11
 * @returns {{year: number, monthIndex: number, label: string,
 *            weeks: Array<Array<{iso: string, day: number}|null>>}}
 */
export function buildMonthGrid(year, monthIndex) {
  // Day 0 of the next month is the last day of this one; this also handles
  // February in leap years without a special case.
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const firstWeekday = new Date(year, monthIndex, 1).getDay();

  /** @type {Array<{iso: string, day: number}|null>} */
  const cells = [];
  for (let i = 0; i < firstWeekday; i += 1) cells.push(null);
  for (let day = 1; day <= daysInMonth; day += 1) {
    cells.push({ iso: toISODate(new Date(year, monthIndex, day)), day });
  }
  while (cells.length % 7 !== 0) cells.push(null);

  const weeks = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));

  const label = `${new Date(year, monthIndex, 1).toLocaleString('en-US', { month: 'long' })} ${year}`;
  return { year, monthIndex, label, weeks };
}

/**
 * @param {unknown} timestamp
 * @returns {Date|null}
 */
function toDate(timestamp) {
  if (typeof timestamp === 'number' && Number.isFinite(timestamp)) {
    return new Date(timestamp);
  }
  if (typeof timestamp === 'string' && timestamp !== '') {
    const parsed = new Date(timestamp);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  return null;
}
