import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildMonthGrid,
  daysUntil,
  formatDaysRemaining,
  formatDueDate,
  formatUpdatedAbsolute,
  formatUpdatedRelative,
  isValidISODate,
  parseISODate,
  toISODate,
  todayISODate,
} from '../js/date-utils.js';
import { fixedNow } from './helpers.js';

test('isValidISODate accepts real calendar dates', () => {
  assert.equal(isValidISODate('2026-09-05'), true);
  assert.equal(isValidISODate('2028-02-29'), true, 'leap day is valid');
});

test('isValidISODate rejects malformed and impossible dates', () => {
  assert.equal(isValidISODate('2026-02-30'), false, 'February never has 30 days');
  assert.equal(isValidISODate('2027-02-29'), false, '2027 is not a leap year');
  assert.equal(isValidISODate('2026-13-01'), false, 'month 13 does not exist');
  assert.equal(isValidISODate('2026-04-31'), false, 'April has 30 days');
  assert.equal(isValidISODate('09/05/2026'), false);
  assert.equal(isValidISODate(''), false);
  assert.equal(isValidISODate(null), false);
  assert.equal(isValidISODate(20260905), false);
});

test('parseISODate returns local midnight, not a UTC instant', () => {
  const date = parseISODate('2026-09-05');
  assert.equal(date.getFullYear(), 2026);
  assert.equal(date.getMonth(), 8);
  assert.equal(date.getDate(), 5, 'the calendar day must not shift by timezone');
  assert.equal(date.getHours(), 0);
});

test('parseISODate returns null for unusable input', () => {
  assert.equal(parseISODate('not-a-date'), null);
  assert.equal(parseISODate(undefined), null);
});

test('toISODate round-trips a local date', () => {
  assert.equal(toISODate(new Date(2026, 0, 7)), '2026-01-07', 'pads month and day');
  assert.equal(toISODate(parseISODate('2026-12-31')), '2026-12-31');
});

test('todayISODate reports the local calendar day', () => {
  assert.equal(todayISODate(fixedNow()), '2026-09-03');
});

test('daysUntil counts whole days in both directions', () => {
  const now = fixedNow(); // 2026-09-03
  assert.equal(daysUntil('2026-09-03', now), 0, 'today');
  assert.equal(daysUntil('2026-09-04', now), 1, 'tomorrow');
  assert.equal(daysUntil('2026-09-05', now), 2);
  assert.equal(daysUntil('2026-09-02', now), -1, 'yesterday');
  assert.equal(daysUntil('2026-09-01', now), -2);
});

test('daysUntil ignores the time of day on the reference date', () => {
  const earlyMorning = new Date(2026, 8, 3, 0, 5);
  const lateNight = new Date(2026, 8, 3, 23, 55);
  assert.equal(daysUntil('2026-09-05', earlyMorning), 2);
  assert.equal(daysUntil('2026-09-05', lateNight), 2);
});

test('daysUntil crosses month and year boundaries', () => {
  assert.equal(daysUntil('2026-10-01', new Date(2026, 8, 30, 9)), 1, 'Sep 30 to Oct 1');
  assert.equal(daysUntil('2027-01-01', new Date(2026, 11, 31, 9)), 1, 'New Year');
  assert.equal(daysUntil('2026-03-01', new Date(2026, 1, 28, 9)), 1, 'non-leap February');
  assert.equal(daysUntil('2028-02-29', new Date(2028, 1, 28, 9)), 1, 'leap day');
});

test('daysUntil returns null for an unparseable date', () => {
  assert.equal(daysUntil('nonsense', fixedNow()), null);
});

test('formatDueDate matches the design and hides the current year', () => {
  const now = fixedNow();
  assert.equal(formatDueDate('2026-09-05', now), 'Sep 5');
  assert.equal(formatDueDate('2026-09-12', now), 'Sep 12');
  assert.equal(formatDueDate('2026-01-01', now), 'Jan 1');
});

test('formatDueDate shows the year when it differs from today', () => {
  assert.equal(formatDueDate('2027-01-04', fixedNow()), 'Jan 4, 2027');
});

test('formatDueDate returns empty text for an invalid date', () => {
  assert.equal(formatDueDate('2026-02-30', fixedNow()), '');
});

test('formatDaysRemaining covers today, future and overdue', () => {
  const now = fixedNow(); // 2026-09-03
  assert.equal(formatDaysRemaining('2026-09-03', now), 'Due today');
  assert.equal(formatDaysRemaining('2026-09-04', now), '1 day left');
  assert.equal(formatDaysRemaining('2026-09-05', now), '2 days left');
  assert.equal(formatDaysRemaining('2026-09-12', now), '9 days left');
  assert.equal(formatDaysRemaining('2026-09-02', now), 'Overdue by 1 day');
  assert.equal(formatDaysRemaining('2026-09-01', now), 'Overdue by 2 days');
});

test('formatDaysRemaining never renders a negative day count', () => {
  const text = formatDaysRemaining('2026-08-20', fixedNow());
  assert.ok(!text.includes('-'), `"${text}" must not contain a minus sign`);
  assert.equal(text, 'Overdue by 14 days');
});

test('buildMonthGrid aligns the first day under its real weekday', () => {
  // 1 September 2026 is a Tuesday, so two leading blanks precede it.
  const grid = buildMonthGrid(2026, 8);
  assert.equal(grid.label, 'September 2026');
  assert.equal(grid.weeks[0][0], null);
  assert.equal(grid.weeks[0][1], null);
  assert.deepEqual(grid.weeks[0][2], { iso: '2026-09-01', day: 1 });
});

test('buildMonthGrid can place Monday in the first calendar column', () => {
  // 1 September 2026 is a Tuesday, so it follows one leading Monday blank.
  const grid = buildMonthGrid(2026, 8, 1);
  assert.equal(grid.weeks[0][0], null);
  assert.deepEqual(grid.weeks[0][1], { iso: '2026-09-01', day: 1 });
});

test('buildMonthGrid emits whole weeks of seven cells', () => {
  for (const monthIndex of [0, 1, 3, 8, 11]) {
    const grid = buildMonthGrid(2026, monthIndex);
    for (const week of grid.weeks) {
      assert.equal(week.length, 7, `month ${monthIndex} produced a short week`);
    }
  }
});

test('buildMonthGrid handles month lengths including leap February', () => {
  const dayCount = (year, month) =>
    buildMonthGrid(year, month)
      .weeks.flat()
      .filter((cell) => cell !== null).length;

  assert.equal(dayCount(2026, 8), 30, 'September has 30 days');
  assert.equal(dayCount(2026, 0), 31, 'January has 31 days');
  assert.equal(dayCount(2027, 1), 28, 'February 2027 has 28 days');
  assert.equal(dayCount(2028, 1), 29, 'February 2028 is a leap month');
});

test('buildMonthGrid handles the year boundary', () => {
  const december = buildMonthGrid(2026, 11);
  const cells = december.weeks.flat().filter((cell) => cell !== null);
  assert.equal(december.label, 'December 2026');
  assert.equal(cells.at(-1).iso, '2026-12-31');
});

test('formatUpdatedAbsolute matches the note card format', () => {
  const now = fixedNow();
  assert.equal(formatUpdatedAbsolute(new Date(2026, 7, 30).toISOString(), now), 'Updated Aug 30');
  assert.equal(formatUpdatedAbsolute(new Date(2025, 7, 29).toISOString(), now), 'Updated Aug 29, 2025');
});

test('formatUpdatedAbsolute degrades safely on bad input', () => {
  assert.equal(formatUpdatedAbsolute('garbage', fixedNow()), 'Updated recently');
  assert.equal(formatUpdatedAbsolute(null, fixedNow()), 'Updated recently');
});

test('formatUpdatedRelative matches the dashboard format', () => {
  const now = fixedNow();
  const minutesAgo = new Date(now.getTime() - 20 * 60000).toISOString();
  const oneHourAgo = new Date(now.getTime() - 65 * 60000).toISOString();
  const yesterday = new Date(now.getTime() - 26 * 3600000).toISOString();
  const lastWeek = new Date(2026, 7, 20).toISOString();

  assert.equal(formatUpdatedRelative(minutesAgo, now), 'Updated recently');
  assert.equal(formatUpdatedRelative(oneHourAgo, now), 'Updated 1h ago');
  assert.equal(formatUpdatedRelative(yesterday, now), 'Updated yesterday');
  assert.equal(formatUpdatedRelative(lastWeek, now), 'Updated Aug 20');
});
