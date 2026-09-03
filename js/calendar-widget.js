/**
 * Section 1 — small Dashboard calendar widget.
 *
 * Read-only. It shows the current month and dots the days that have assignments
 * due, using the same assignment records as every other view.
 *
 * This is NOT the full Calendar page (Section 4) — no navigation between
 * months, no event creation, no scheduling. That page is Programmer 2's.
 */

import { buildMonthGrid, todayISODate, WEEKDAY_INITIALS, WEEKDAY_NAMES } from './date-utils.js';
import { assignmentCountsByDueDate } from './queries.js';
import { el } from './dom.js';

/**
 * @param {object[]} assignments
 * @param {Date} [now]
 * @returns {HTMLElement} the widget body, ready to insert into its card.
 */
export function renderCalendarWidget(assignments, now = new Date(), weekStartsOn = 0) {
  const grid = buildMonthGrid(now.getFullYear(), now.getMonth(), weekStartsOn);
  const dueCounts = assignmentCountsByDueDate(assignments);
  const today = todayISODate(now);

  const cells = [];

  // Weekday initials repeat letters (S, T, S, T), so each carries its full name
  // for screen readers while the visible text stays a single character.
  const weekdayIndices = Array.from({ length: 7 }, (_, index) => (index + weekStartsOn) % 7);
  weekdayIndices.forEach((weekdayIndex) => {
    cells.push(
      el('div', { class: 'calendar-grid__weekday', role: 'columnheader' }, [
        el('span', { 'aria-hidden': 'true', text: WEEKDAY_INITIALS[weekdayIndex] }),
        el('span', { class: 'visually-hidden', text: WEEKDAY_NAMES[weekdayIndex] }),
      ]),
    );
  });

  for (const week of grid.weeks) {
    for (const cell of week) {
      if (cell === null) {
        // Padding before the 1st and after the last day: present so the columns
        // stay aligned, hidden from sight and from assistive technology.
        cells.push(el('div', { class: 'calendar-day calendar-day--empty', 'aria-hidden': 'true' }));
        continue;
      }

      const dueCount = dueCounts.get(cell.iso) ?? 0;
      const isToday = cell.iso === today;

      const classNames = ['calendar-day'];
      if (dueCount > 0) classNames.push('calendar-day--due');
      if (isToday) classNames.push('calendar-day--today');

      cells.push(
        el('div', {
          class: classNames.join(' '),
          text: String(cell.day),
          title: describeDay(cell.day, grid.label, dueCount, isToday),
          'aria-label': describeDay(cell.day, grid.label, dueCount, isToday),
        }),
      );
    }
  }

  return el('div', {}, [
    el('p', { class: 'calendar-widget__month', text: grid.label }),
    el('div', { class: 'calendar-grid', role: 'grid', 'aria-label': `${grid.label} calendar` }, cells),
  ]);
}

/**
 * Build the text that conveys the due-date marker without relying on colour.
 *
 * @param {number} day
 * @param {string} monthLabel
 * @param {number} dueCount
 * @param {boolean} isToday
 * @returns {string}
 */
function describeDay(day, monthLabel, dueCount, isToday) {
  const parts = [`${monthLabel.split(' ')[0]} ${day}`];
  if (isToday) parts.push('today');
  if (dueCount === 1) parts.push('1 assignment due');
  else if (dueCount > 1) parts.push(`${dueCount} assignments due`);
  return parts.join(', ');
}
