/**
 * Small DOM helpers shared by every page controller.
 *
 * `el()` sets user text through `textContent` only. Nothing in this app builds
 * markup by concatenating record fields into `innerHTML`, so a note containing
 * `<script>` or `<img onerror=...>` renders as the literal characters the
 * student typed.
 */

/**
 * Create an element.
 *
 * @param {string} tag
 * @param {object} [props] `class`, `text`, `html`-free attributes, `dataset`,
 *   and `on<Event>` handlers. Anything else becomes an attribute.
 * @param {Array<Node|string>} [children]
 * @returns {HTMLElement}
 */
export function el(tag, props = {}, children = []) {
  const node = document.createElement(tag);

  for (const [key, value] of Object.entries(props)) {
    if (value === null || value === undefined || value === false) continue;

    if (key === 'class') {
      node.className = value;
    } else if (key === 'text') {
      node.textContent = String(value);
    } else if (key === 'dataset') {
      for (const [dataKey, dataValue] of Object.entries(value)) {
        node.dataset[dataKey] = String(dataValue);
      }
    } else if (key.startsWith('on') && typeof value === 'function') {
      node.addEventListener(key.slice(2).toLowerCase(), value);
    } else if (value === true) {
      node.setAttribute(key, '');
    } else {
      node.setAttribute(key, String(value));
    }
  }

  for (const child of children) {
    if (child === null || child === undefined) continue;
    node.append(typeof child === 'string' ? document.createTextNode(child) : child);
  }

  return node;
}

/**
 * Replace a container's contents in one step.
 * @param {Element} container
 * @param {Array<Node>} children
 */
export function render(container, children) {
  container.replaceChildren(...children.filter(Boolean));
}

/**
 * @param {string} selector
 * @param {ParentNode} [scope]
 * @returns {HTMLElement|null}
 */
export function qs(selector, scope = document) {
  return scope.querySelector(selector);
}

/**
 * Build the standard empty-state block used across Sections 1-3.
 * @param {string} message
 * @returns {HTMLElement}
 */
export function emptyState(message) {
  return el('p', { class: 'empty-state', text: message });
}

/**
 * Read a query-string parameter from the current URL.
 * @param {string} name
 * @returns {string|null}
 */
export function getQueryParam(name) {
  return new URLSearchParams(window.location.search).get(name);
}

/**
 * Resolve a "where do Cancel and Back go" target.
 *
 * Only the Section 1-3 pages are accepted. An unexpected or crafted `return`
 * value falls back to the caller's default instead of navigating anywhere the
 * URL asks it to.
 *
 * @param {string} fallback
 * @returns {string}
 */
export function getReturnTarget(fallback) {
  const allowed = new Set(['index.html', 'assignments.html', 'notes.html', 'calendar.html']);
  const requested = getQueryParam('return');
  return requested !== null && allowed.has(requested) ? requested : fallback;
}

/**
 * Show or clear the inline error message attached to one form field.
 *
 * @param {string} fieldId id of the input/select/textarea.
 * @param {string} [message] omit or pass "" to clear.
 */
export function setFieldError(fieldId, message = '') {
  const field = document.getElementById(fieldId);
  const errorNode = document.getElementById(`${fieldId}-error`);
  if (field === null || errorNode === null) return;

  errorNode.textContent = message;
  errorNode.hidden = message === '';
  field.setAttribute('aria-invalid', message === '' ? 'false' : 'true');
  field.classList.toggle('is-invalid', message !== '');
}

/**
 * Show or clear the form-level status message (used for failed saves).
 * @param {string} containerId
 * @param {string} [message]
 */
export function setFormMessage(containerId, message = '') {
  const node = document.getElementById(containerId);
  if (node === null) return;
  node.textContent = message;
  node.hidden = message === '';
}
