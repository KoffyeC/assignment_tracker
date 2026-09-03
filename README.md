# Student Planner

A student assignment and note planner built with semantic HTML5, CSS, and vanilla
JavaScript (ES modules). No frameworks, no build step, no dependencies.

## Scope

This repository currently contains **Programmer 1's** work only:

| Section | Status | Owner |
| --- | --- | --- |
| 1. Dashboard | Implemented | Programmer 1 |
| 2. Assignments | Implemented | Programmer 1 |
| 3. Notes | Implemented | Programmer 1 |
| 4. Full Calendar page | Not started | Programmer 2 |
| 5. Settings | Not started | Programmer 2 |
| 6. Log Out | Not started | Programmer 2 |
| 7. Shared sidebar / app-wide navigation | Not started | Programmer 2 |

Sections 1–3 are usable on their own. The small read-only calendar **widget** on
the Dashboard is part of Section 1; the full Calendar **page** is Section 4 and
has deliberately not been built.

Each page carries a minimal `<nav>` linking only the three Programmer 1 pages,
marked in the markup as a placeholder. Programmer 2 replaces that block with the
real shared sidebar (Calendar, Settings, Log Out, and app-wide active-link
handling).

## Running

ES modules are blocked by the browser over `file://`, so serve the folder over
HTTP:

```bash
npm run serve       # python3 -m http.server 8000
```

Then open <http://localhost:8000/>.

## Testing

```bash
npm test            # node --test "tests/**/*.test.js"
```

Uses Node's built-in test runner — no framework is installed.

## Pages

| File | Purpose |
| --- | --- |
| `index.html` | Dashboard |
| `assignments.html` | Assignment list (upcoming + completed) |
| `assignment-form.html` | Add assignment; `?id=<id>` switches it to edit |
| `notes.html` | Note cards |
| `note-form.html` | Add note; `?id=<id>` switches it to edit |

Both form pages also accept `?return=<page>` to control where Back and Cancel
go. Only `index.html`, `assignments.html`, and `notes.html` are accepted.

## Architecture

```
js/
  storage.js         the only module that touches localStorage
  models.js          record shapes, id generation, read-time repair
  validation.js      pure form validation
  date-utils.js      due-date parsing, formatting, month grids
  priority.js        the single priority label/colour/order mapping
  queries.js         pure selection + ordering (upcoming, completed, recent)
  dom.js             small render helpers; all text set via textContent
  dashboard.js  assignments.js  assignment-form.js
  notes.js      note-form.js    calendar-widget.js      page controllers
```

Data, business logic, and DOM rendering are kept in separate modules. The
Dashboard has no data of its own — it reads the same assignment and note records
the Assignments and Notes pages use.

## Storage keys (for Programmer 2)

| Key | Contents |
| --- | --- |
| `studentPlanner.assignments.v1` | `Assignment[]` |
| `studentPlanner.notes.v1` | `Note[]` |
| `studentPlanner.quickNote.v1` | `{ text: string, noteId: string \| null }` |

Do not read these keys directly — import `storage` from `js/storage.js`, which
validates and repairs the stored data on every read.

### Assignment

```js
{
  id: string,        // stable uuid; records are never identified by name
  name: string,
  class: string,     // a legacy `course` field is accepted on read
  dueDate: string,   // "YYYY-MM-DD" local calendar date, never formatted text
  priority: string,  // exactly "High" | "Medium" | "Low"
  completed: boolean,
  createdAt: string, // ISO timestamp
  updatedAt: string  // ISO timestamp
}
```

### Note

```js
{
  id: string,
  title: string,
  content: string,   // stored verbatim, including newlines
  createdAt: string,
  updatedAt: string  // advances only on a successful save
}
```

## Integration points for Programmer 2

The full Calendar page can be built on the existing modules without adding a
second data system:

```js
import { storage } from './js/storage.js';
import { assignmentCountsByDueDate, upcomingAssignments } from './js/queries.js';
import { buildMonthGrid, formatDueDate, daysUntil } from './js/date-utils.js';
import { priorityCssClass } from './js/priority.js';

const assignments = storage.getAssignments();          // every due date
const dots = assignmentCountsByDueDate(assignments);   // Map<"YYYY-MM-DD", count>
const grid = buildMonthGrid(2026, 8);                  // any month, any year
```

Also available: `storage.setQuickNote(text, noteId?)` for whoever owns Quick
Note authoring, and the `.badge--high/medium/low` classes plus the design tokens
in `css/shared.css`.

Every mutation returns `{ ok: true, record }` or `{ ok: false, error }` rather
than throwing, so a failed write is never mistaken for a successful one.
