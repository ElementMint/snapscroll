/**
 * @file dom.js
 * @description Zero-layout-thrash DOM utilities.
 * All reads are batched, writes are deferred via rAF.
 */

/**
 * Query a single element
 * @param {string} selector
 * @param {HTMLElement|Document} [root=document]
 * @returns {HTMLElement|null}
 */
export const $ = (selector, root = document) =>
  root.querySelector(selector);

/**
 * Query all elements as an Array
 * @param {string} selector
 * @param {HTMLElement|Document} [root=document]
 * @returns {HTMLElement[]}
 */
export const $$ = (selector, root = document) =>
  Array.from(root.querySelectorAll(selector));

/**
 * Add one or more classes
 * @param {HTMLElement} el
 * @param {...string} classes
 */
export function addClass(el, ...classes) {
  if (!el) return;
  el.classList.add(...classes.filter(Boolean));
}

/**
 * Remove one or more classes
 * @param {HTMLElement} el
 * @param {...string} classes
 */
export function removeClass(el, ...classes) {
  if (!el) return;
  el.classList.remove(...classes.filter(Boolean));
}

/**
 * Toggle a class
 * @param {HTMLElement} el
 * @param {string} cls
 * @param {boolean} [force]
 */
export function toggleClass(el, cls, force) {
  if (!el) return;
  el.classList.toggle(cls, force);
}

/**
 * Check if element has class
 * @param {HTMLElement} el
 * @param {string} cls
 * @returns {boolean}
 */
export function hasClass(el, cls) {
  return el?.classList.contains(cls) ?? false;
}

/**
 * Set CSS custom properties on element
 * @param {HTMLElement} el
 * @param {Object<string,string>} props
 */
export function setCSSVars(el, props) {
  if (!el) return;
  for (const [k, v] of Object.entries(props)) {
    el.style.setProperty(k, v);
  }
}

/**
 * Batch-set multiple inline style properties
 * @param {HTMLElement} el
 * @param {Object<string,string>} styles
 */
export function setStyles(el, styles) {
  if (!el) return;
  for (const [k, v] of Object.entries(styles)) {
    el.style[k] = v;
  }
}

/**
 * Get computed style value (triggers reflow — use sparingly, batch reads)
 * @param {HTMLElement} el
 * @param {string} prop
 * @returns {string}
 */
export function getStyle(el, prop) {
  return getComputedStyle(el).getPropertyValue(prop);
}

/**
 * Set ARIA attribute
 * @param {HTMLElement} el
 * @param {string} attr
 * @param {string|boolean} value
 */
export function setAria(el, attr, value) {
  if (!el) return;
  el.setAttribute(`aria-${attr}`, String(value));
}

/**
 * Create an element with optional attributes and children
 * @param {string} tag
 * @param {Object} [attrs={}]
 * @param {...(string|HTMLElement)} children
 * @returns {HTMLElement}
 */
export function createElement(tag, attrs = {}, ...children) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class') {
      el.className = v;
    } else if (k.startsWith('aria-') || k.startsWith('data-') || k === 'role' || k === 'tabindex') {
      el.setAttribute(k, v);
    } else {
      el[k] = v;
    }
  }
  children.forEach(child => {
    if (typeof child === 'string') el.appendChild(document.createTextNode(child));
    else if (child instanceof HTMLElement) el.appendChild(child);
  });
  return el;
}

/**
 * Schedule a DOM write on next animation frame
 * @param {Function} fn
 * @returns {number} rAF id
 */
export function scheduleWrite(fn) {
  return requestAnimationFrame(fn);
}

/**
 * Get element's bounding rect (read phase)
 * @param {HTMLElement} el
 * @returns {DOMRectReadOnly}
 */
export function getRect(el) {
  return el.getBoundingClientRect();
}

/**
 * Safely focus an element without scroll jump
 * @param {HTMLElement} el
 */
export function focusWithoutScroll(el) {
  if (!el) return;
  el.focus({ preventScroll: true });
}

/**
 * Find closest ancestor matching selector (or self)
 * @param {HTMLElement} el
 * @param {string} selector
 * @returns {HTMLElement|null}
 */
export function closest(el, selector) {
  return el?.closest(selector) ?? null;
}
