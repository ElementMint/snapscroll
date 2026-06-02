/**
 * @file overflow.js
 * @description Overflow sections handler.
 *
 * Sections marked with [data-fp-overflow] scroll their inner content
 * first. Only after reaching the top or bottom edge does the engine
 * hand off to the next/previous section snap.
 *
 * Strategy:
 *  1. The section itself is overflow-y: auto (CSS handles inner scroll)
 *  2. We watch its scroll position with a passive scroll listener
 *  3. Wheel events on this section are consumed for inner scroll until
 *     the section reaches the top or bottom edge — then we yield to
 *     the engine's moveDown/moveUp
 *  4. Touch swipes follow the same edge detection
 */

import { CLASSES, ATTRS }      from '../core/constants.js';
import { addClass }             from '../utils/dom.js';
import { PASSIVE_OPTS }         from '../utils/performance.js';

/**
 * @typedef {Object} OverflowHandler
 * @property {Function} destroy
 */

/**
 * Attach overflow scroll logic to a section
 * @param {HTMLElement} section
 * @param {Object} callbacks
 * @param {Function} callbacks.onScrollUp   - Yield to previous section
 * @param {Function} callbacks.onScrollDown - Yield to next section
 * @param {Object} [options={}]
 * @param {number}  [options.edgeThreshold=2]  - px from edge considered "at edge"
 * @returns {OverflowHandler}
 */
export function createOverflowHandler(section, callbacks, options = {}) {
  const { edgeThreshold = 2 } = options;

  addClass(section, CLASSES.OVERFLOW, CLASSES.SCROLLABLE);

  /**
   * Is the section scrolled to the very top?
   * @returns {boolean}
   */
  function atTop() {
    return section.scrollTop <= edgeThreshold;
  }

  /**
   * Is the section scrolled to the very bottom?
   * @returns {boolean}
   */
  function atBottom() {
    return (
      section.scrollTop + section.clientHeight >=
      section.scrollHeight - edgeThreshold
    );
  }

  /** @param {WheelEvent} e */
  function onWheel(e) {
    const goingDown = e.deltaY > 0;
    const goingUp   = e.deltaY < 0;

    if (goingDown && atBottom()) {
      // Let the engine take over
      callbacks.onScrollDown?.();
    } else if (goingUp && atTop()) {
      callbacks.onScrollUp?.();
    }
    // Otherwise: natural inner scroll proceeds (passive — we never preventDefault)
  }

  section.addEventListener('wheel', onWheel, PASSIVE_OPTS);

  // Track touch position for swipe detection at edges
  let touchStartY = 0;

  function onTouchStart(e) {
    touchStartY = e.touches[0].clientY;
  }

  function onTouchEnd(e) {
    const deltaY  = touchStartY - e.changedTouches[0].clientY;
    const swipeUp = deltaY > 30;   // user swiped up → content scrolls down
    const swipeDown = deltaY < -30;

    if (swipeUp && atBottom()) {
      callbacks.onScrollDown?.();
    } else if (swipeDown && atTop()) {
      callbacks.onScrollUp?.();
    }
  }

  section.addEventListener('touchstart', onTouchStart, PASSIVE_OPTS);
  section.addEventListener('touchend',   onTouchEnd,   PASSIVE_OPTS);

  return {
    destroy() {
      section.removeEventListener('wheel',      onWheel,     PASSIVE_OPTS);
      section.removeEventListener('touchstart', onTouchStart,PASSIVE_OPTS);
      section.removeEventListener('touchend',   onTouchEnd,  PASSIVE_OPTS);
    }
  };
}

/**
 * Scan sections and set up overflow handlers for any
 * that have the [data-fp-overflow] attribute.
 *
 * @param {HTMLElement[]} sections
 * @param {Object} callbacks
 * @param {Function} callbacks.onScrollUp
 * @param {Function} callbacks.onScrollDown
 * @returns {OverflowHandler[]}
 */
export function initOverflowSections(sections, callbacks) {
  return sections
    .filter(s => s.hasAttribute(ATTRS.OVERFLOW))
    .map(s => createOverflowHandler(s, callbacks));
}
