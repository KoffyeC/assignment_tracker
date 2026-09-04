import { storage } from './storage.js';
import {
  buildMonthGrid,
  parseISODate,
  todayISODate,
  WEEKDAY_NAMES,
} from './date-utils.js';
import { assignmentsByDueDate } from './queries.js';
import { priorityCssClass } from './priority.js';
import { el, emptyState, render } from './dom.js';

const monthLabel = document.getElementById('calendar-month-label');
const calendarGrid = document.getElementById('calendar-page-grid');
const selectedDateLabel = document.getElementById('selected-date-label');
const selectedAssignments = document.getElementById('selected-assignments');

const today = new Date();
let visibleYear = today.getFullYear();
let visibleMonth = today.getMonth();
let selectedDate = todayISODate(today);

document.getElementById('previous-month').addEventListener('click', () => changeMonth(-1));
document.getElementById('next-month').addEventListener('click', () => changeMonth(1));
document.getElementById('today-button').addEventListener('click', showToday);

renderCalendar();

function changeMonth(amount) {
  const next = new Date(visibleYear, visibleMonth + amount, 1);
  visibleYear = next.getFullYear();
  visibleMonth = next.getMonth();
  selectedDate = `${visibleYear}-${String(visibleMonth + 1).padStart(2, '0')}-01`;
  renderCalendar();
}

function showToday() {
  visibleYear = today.getFullYear();
  visibleMonth = today.getMonth();
  selectedDate = todayISODate(today);
  renderCalendar();
}

function renderCalendar() {
  const assignments = storage.getAssignments();
  const settings = storage.getSettings();
  const weekStartsOn = settings.weekStartsOn === 'monday' ? 1 : 0;
  const grid = buildMonthGrid(visibleYear, visibleMonth, weekStartsOn);
  const grouped = assignmentsByDueDate(assignments, {
    includeCompleted: settings.showCompletedOnCalendar,
  });

  monthLabel.textContent = grid.label;
  render(calendarGrid, buildGridChildren(grid, grouped, weekStartsOn));
  renderSelectedDate(grouped);
}

function buildGridChildren(grid, grouped, weekStartsOn) {
  const children = [];
  const weekdayIndices = Array.from({ length: 7 }, (_, index) => (index + weekStartsOn) % 7);

  for (const index of weekdayIndices) {
    children.push(
      el('div', {
        class: 'calendar-page__weekday',
        role: 'columnheader',
        text: WEEKDAY_NAMES[index].slice(0, 3),
      }),
    );
  }

  for (const week of grid.weeks) {
    for (const cell of week) {
      if (cell === null) {
        children.push(el('div', { class: 'calendar-page__day calendar-page__day--empty' }));
        continue;
      }

      const assignments = grouped.get(cell.iso) ?? [];
      const isToday = cell.iso === todayISODate(today);
      const isSelected = cell.iso === selectedDate;
      const classes = ['calendar-page__day'];
      if (isToday) classes.push('calendar-page__day--today');
      if (isSelected) classes.push('calendar-page__day--selected');

      const assignmentItems = assignments.slice(0, 2).map((assignment) =>
        el('span', {
          class: `calendar-event ${priorityCssClass(assignment.priority)}${assignment.completed ? ' calendar-event--completed' : ''}`,
          text: assignment.name,
          title: `${assignment.name} · ${assignment.class}`,
        }),
      );
      if (assignments.length > 2) {
        assignmentItems.push(
          el('span', { class: 'calendar-page__more', text: `+${assignments.length - 2} more` }),
        );
      }

      children.push(
        el(
          'button',
          {
            class: classes.join(' '),
            type: 'button',
            'aria-label': describeDate(cell.iso, assignments.length, isToday),
            'aria-pressed': String(isSelected),
            onClick: () => {
              selectedDate = cell.iso;
              renderCalendar();
            },
          },
          [
            el('span', { class: 'calendar-page__day-number', text: String(cell.day) }),
            el('span', { class: 'calendar-page__events' }, assignmentItems),
          ],
        ),
      );
    }
  }
  return children;
}

function renderSelectedDate(grouped) {
  const date = parseISODate(selectedDate);
  const assignments = grouped.get(selectedDate) ?? [];
  selectedDateLabel.textContent = date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  if (assignments.length === 0) {
    render(selectedAssignments, [emptyState('No assignments due on this date.')]);
    return;
  }

  render(selectedAssignments, [
    el(
      'ul',
      { class: 'calendar-detail-list' },
      assignments.map((assignment) =>
        el('li', { class: 'calendar-detail' }, [
          el('div', {}, [
            el('p', { class: 'calendar-detail__name wrap-anywhere', text: assignment.name }),
            el('p', { class: 'calendar-detail__class wrap-anywhere', text: assignment.class }),
          ]),
          el('span', {
            class: assignment.completed
              ? 'badge badge--completed'
              : `badge ${priorityCssClass(assignment.priority)}`,
            text: assignment.completed ? 'Completed' : assignment.priority,
          }),
          el('a', {
            class: 'btn-link',
            href: `assignment-form.html?id=${encodeURIComponent(assignment.id)}&return=calendar.html`,
            text: 'Edit',
            'aria-label': `Edit ${assignment.name}`,
          }),
        ]),
      ),
    ),
  ]);
}

function describeDate(isoDate, assignmentCount, isToday) {
  const date = parseISODate(isoDate);
  const parts = [date.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })];
  if (isToday) parts.push('today');
  if (assignmentCount === 1) parts.push('1 assignment due');
  else if (assignmentCount > 1) parts.push(`${assignmentCount} assignments due`);
  return parts.join(', ');
}
