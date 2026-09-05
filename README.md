# Student Planner

A student assignment, note, and calendar planner built with semantic HTML5, CSS, and vanilla
JavaScript (ES modules). No frameworks or build step are required for the application itself.

## Scope

The shared Programmer 2 scope is now integrated with the original planner:

| Section | Status | Owner |
| --- | --- | --- |
| 1. Dashboard | Implemented | Programmer 1 |
| 2. Assignments | Implemented | Programmer 1 |
| 3. Notes | Implemented | Programmer 1 |
| 4. Full Calendar page | Implemented | Programmer 2 |
| 5. Settings | Implemented | Programmer 2 |
| 6. Log Out | Implemented | Programmer 2 |
| 7. Shared sidebar / app-wide navigation | Implemented | Programmer 2 |

The small read-only calendar **widget** on the Dashboard remains part of Section
1. The full Calendar page adds month navigation, date selection, and due-date
details while using the same assignment records.

## Running

ES modules are blocked by the browser over `file://`, so serve the folder over
HTTP:

```bash
npm run serve       # python3 -m http.server 8000
```

Then open <http://localhost:8000/>.

## Testing

```bash
npm test            # runs unit/integration, smoke, and regression tests
npm run test:smoke       # Selenium smoke tests
npm run test:regression  # Selenium regression tests
```

Includes unit, smoke, and regression testing. Selenium WebDriver is included as a development dependency for automated QA testing.

## Pages

| File | Purpose |
| --- | --- |
| `index.html` | Dashboard |
| `assignments.html` | Assignment list (upcoming + completed) |
| `assignment-form.html` | Add assignment; `?id=<id>` switches it to edit |
| `notes.html` | Note cards |
| `note-form.html` | Add note; `?id=<id>` switches it to edit |
| `calendar.html` | Navigable month calendar and assignment due dates |
| `settings.html` | Greeting and calendar preferences |
| `login.html` | Local project session screen shown after Log Out |

Both form pages also accept `?return=<page>` to control where Back and Cancel
go. Only planner pages are accepted.

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
  calendar.js   settings.js     app-shell.js             shared Programmer 2 UI
  session.js                                               local session behavior
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
| `studentPlanner.settings.v1` | calendar preferences and optional display name |

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
