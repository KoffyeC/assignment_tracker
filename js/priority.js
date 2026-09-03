/**
 * Priority mapping for assignments.
 *
 * This is the ONLY place priority labels, ordering, and CSS class names are
 * defined. Pages must not invent their own priority colors or labels.
 */

/** The only three priority values the application accepts. */
export const PRIORITIES = Object.freeze(['High', 'Medium', 'Low']);

/** Priority used when a form does not specify one (matches the Figma default). */
export const DEFAULT_PRIORITY = 'Medium';

/** Sort weight: lower sorts first. Used only as a tie-breaker after due date. */
const SORT_RANK = Object.freeze({ High: 0, Medium: 1, Low: 2 });

/** CSS modifier class per priority. Paired with `.badge` in css/shared.css. */
const CSS_CLASS = Object.freeze({
  High: 'badge--high',
  Medium: 'badge--medium',
  Low: 'badge--low',
});

/**
 * @param {unknown} value
 * @returns {boolean} true only for the exact strings High, Medium, or Low.
 */
export function isValidPriority(value) {
  return typeof value === 'string' && PRIORITIES.includes(value);
}

/**
 * Coerce loose input (e.g. "high", " medium ") to a canonical priority.
 * @param {unknown} value
 * @returns {string|null} A canonical priority, or null when unrecognisable.
 */
export function normalizePriority(value) {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim().toLowerCase();
  const match = PRIORITIES.find((p) => p.toLowerCase() === trimmed);
  return match ?? null;
}

/**
 * @param {unknown} priority
 * @returns {string} The badge modifier class, falling back to the default.
 */
export function priorityCssClass(priority) {
  return CSS_CLASS[normalizePriority(priority) ?? DEFAULT_PRIORITY];
}

/**
 * @param {unknown} priority
 * @returns {number} Sort rank; unknown values sort last.
 */
export function prioritySortRank(priority) {
  const normalized = normalizePriority(priority);
  return normalized === null ? PRIORITIES.length : SORT_RANK[normalized];
}
