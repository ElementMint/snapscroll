/**
 * @file performance.js
 * @description Performance utilities: throttle, debounce, passive listeners,
 * rAF scheduling, and layout read/write batching.
 */

/**
 * Throttle a function — fires at most once per `limit` ms
 * @param {Function} fn
 * @param {number} limit
 * @returns {Function}
 */
export function throttle(fn, limit) {
  let lastCall = 0;
  let rafId = null;

  return function throttled(...args) {
    const now = performance.now();
    if (now - lastCall >= limit) {
      lastCall = now;
      if (rafId) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => fn.apply(this, args));
    }
  };
}

/**
 * Debounce a function — fires after `delay` ms of inactivity
 * @param {Function} fn
 * @param {number} delay
 * @returns {Function & { cancel: Function }}
 */
export function debounce(fn, delay) {
  let timer = null;

  function debounced(...args) {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      timer = null;
      fn.apply(this, args);
    }, delay);
  }

  debounced.cancel = () => {
    if (timer) clearTimeout(timer);
    timer = null;
  };

  return debounced;
}

/**
 * Returns passive event listener options, with feature detection
 * @type {{ passive: boolean } | boolean}
 */
export const PASSIVE_OPTS = (() => {
  let supported = false;
  try {
    const opts = Object.defineProperty({}, 'passive', {
      get() { supported = true; }
    });
    window.addEventListener('_fp_test', null, opts);
    window.removeEventListener('_fp_test', null, opts);
  } catch (e) { /* noop */ }
  return supported ? { passive: true } : false;
})();

/**
 * Passive + non-capturing options
 * @type {AddEventListenerOptions}
 */
export const PASSIVE_NON_CAPTURE = (() => {
  let supported = false;
  try {
    const opts = Object.defineProperty({}, 'passive', {
      get() { supported = true; }
    });
    window.addEventListener('_fp_test2', null, opts);
    window.removeEventListener('_fp_test2', null, opts);
  } catch (e) { /* noop */ }
  return supported ? { passive: true, capture: false } : false;
})();

/**
 * Read/write batching queue to avoid layout thrashing.
 * Inspired by FastDom patterns.
 */
const _reads  = [];
const _writes = [];
let   _rafScheduled = false;

function _flush() {
  _rafScheduled = false;
  const reads  = _reads.splice(0);
  const writes = _writes.splice(0);
  reads.forEach(fn  => fn());
  writes.forEach(fn => fn());
}

/**
 * Schedule a DOM read (before writes)
 * @param {Function} fn
 */
export function read(fn) {
  _reads.push(fn);
  if (!_rafScheduled) {
    _rafScheduled = true;
    requestAnimationFrame(_flush);
  }
}

/**
 * Schedule a DOM write (after reads)
 * @param {Function} fn
 */
export function write(fn) {
  _writes.push(fn);
  if (!_rafScheduled) {
    _rafScheduled = true;
    requestAnimationFrame(_flush);
  }
}

/**
 * Check if we're on a touch device
 * @returns {boolean}
 */
export function isTouchDevice() {
  return (
    'ontouchstart' in window ||
    navigator.maxTouchPoints > 0 ||
    window.matchMedia?.('(pointer: coarse)').matches
  );
}

/**
 * Check if device prefers reduced motion
 * @returns {boolean}
 */
export function prefersReducedMotion() {
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
}

/**
 * Get device pixel ratio (clamped for GPU safety)
 * @returns {number}
 */
export function getDevicePixelRatio() {
  return Math.min(window.devicePixelRatio || 1, 3);
}

/**
 * Detect if page is in AEM author/edit mode
 * Multiple detection strategies for robustness
 * @returns {boolean}
 */
export function isAEMAuthorMode() {
  // Strategy 1: WCM mode cookie or param
  if (typeof Granite !== 'undefined') return true;

  // Strategy 2: CQ namespace
  if (typeof CQ !== 'undefined') return true;

  // Strategy 3: AEM author body classes
  const bodyClasses = document.body.classList;
  if (
    bodyClasses.contains('page') &&
    (
      bodyClasses.contains('aem-AuthorLayer-Edit') ||
      bodyClasses.contains('aem-AuthorLayer-Preview') ||
      bodyClasses.contains('wcm-mode-edit') ||
      bodyClasses.contains('wcm-mode-design')
    )
  ) return true;

  // Strategy 4: wcmmode URL param
  if (/[?&]wcmmode=(edit|design)/i.test(window.location.search)) return true;

  // Strategy 5: Editable placeholders exist
  if (document.querySelector('[data-cq-data-path]')) return true;

  return false;
}

/**
 * Run a microtask (faster than setTimeout 0)
 * @param {Function} fn
 */
export const nextTick = typeof queueMicrotask !== 'undefined'
  ? queueMicrotask
  : (fn) => Promise.resolve().then(fn);
