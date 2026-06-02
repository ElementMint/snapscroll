/**
 * @file wheel.js
 * @description Mouse wheel / trackpad scroll module.
 * Uses a NON-passive listener so we can call preventDefault() to stop
 * CSS scroll-snap from reacting to wheel events independently.
 * Without this, both CSS snap AND the JS scroll animation run simultaneously,
 * causing visible flicker as they fight over the scroll position.
 *
 * Exception: overflow sections (data-fp-overflow) handle their own vertical
 * scroll. We allow native scroll there until the content hits its limit,
 * then hand off to section navigation.
 */

import { WHEEL } from '../core/constants.js';

/**
 * @typedef {Object} WheelHandler
 * @property {Function} destroy
 */

/**
 * Returns the nearest scrollable overflow section ancestor of the event target,
 * or null if the target is not inside one.
 * @param {EventTarget} target
 * @returns {HTMLElement|null}
 */
function getOverflowSection(target) {
  return target?.closest?.('[data-fp-overflow]') ?? null;
}

/**
 * Returns true when the overflow element still has room to scroll in the
 * given direction — meaning we should let the browser handle it natively.
 * @param {HTMLElement} el
 * @param {boolean} scrollingDown
 * @returns {boolean}
 */
function overflowCanScroll(el, scrollingDown) {
  if (!el) return false;
  const { scrollTop, scrollHeight, clientHeight } = el;
  const atTop    = scrollTop <= 0;
  const atBottom = scrollTop + clientHeight >= scrollHeight - 1; // 1px tolerance
  if (scrollingDown) return !atBottom;
  return !atTop;
}

/**
 * Create a wheel event handler for section navigation
 * @param {HTMLElement} el - Element to attach to (the fp-wrapper)
 * @param {Object} callbacks
 * @param {Function} callbacks.onScrollDown - Move to next section
 * @param {Function} callbacks.onScrollUp   - Move to previous section
 * @param {Object}  [options={}]
 * @param {number}  [options.threshold]     - Min delta to trigger
 * @param {number}  [options.cooldown]      - Ms between nav events
 * @returns {WheelHandler}
 */
export function createWheelHandler(el, callbacks, options = {}) {
  const {
    threshold         = WHEEL.DELTA_THRESHOLD,
    cooldown          = WHEEL.COOLDOWN_MS,
    isOverflowLocked  = () => false,
  } = options;

  let lastTriggerTime  = 0;
  let accumulatedDelta = 0;
  let clearAccumTimer  = null;

  function onWheel(e) {
    const now    = performance.now();
    const deltaY = e.deltaY;
    const deltaX = e.deltaX;
    const absY   = Math.abs(deltaY);
    const absX   = Math.abs(deltaX);

    // Ignore purely horizontal events — user is scrolling a slide container.
    if (absX > absY * 2 && absX > threshold) return;

    const delta       = absY >= absX ? deltaY : deltaX;
    const scrollingDown = delta > 0;

    // If the event originated inside an overflow section that still has
    // content to scroll in this direction, do NOT call preventDefault —
    // let the browser scroll the section content naturally.
    // Once the overflow section reaches its limit the next wheel event
    // will fall through to section navigation below.
    const overflowEl = getOverflowSection(e.target);
    if (overflowEl && overflowCanScroll(overflowEl, scrollingDown)) {
      // If we just landed on this overflow section (inertia lock active),
      // block the overflow content from scrolling until the lock expires.
      if (isOverflowLocked()) {
        e.preventDefault();
        return;
      }
      // Otherwise let the browser scroll the overflow content natively.
      // Reset accumulator so the inertia tail doesn't also trigger section nav.
      accumulatedDelta = 0;
      lastTriggerTime  = now;
      return;
    }

    // For all other cases: preventDefault blocks CSS scroll-snap from reacting
    // to the wheel event directly. JS owns the scroll via container.scrollTo().
    // Without this, CSS snap and JS both animate simultaneously → flicker.
    e.preventDefault();

    // Accumulate delta for trackpad inertia burst detection
    accumulatedDelta += Math.abs(delta);
    if (clearAccumTimer) clearTimeout(clearAccumTimer);
    clearAccumTimer = setTimeout(() => { accumulatedDelta = 0; }, 200);

    // Enforce cooldown between navigations
    if (now - lastTriggerTime < cooldown) return;

    // Require minimum delta
    if (Math.abs(delta) < threshold) return;

    // Require a burst of accumulated movement (prevents single-tick accidentals)
    if (accumulatedDelta < threshold * 1.5 && Math.abs(delta) < threshold * 2) return;

    lastTriggerTime  = now;
    accumulatedDelta = 0;

    if (scrollingDown) {
      callbacks.onScrollDown?.({ delta, originalEvent: e });
    } else {
      callbacks.onScrollUp?.({ delta, originalEvent: e });
    }
  }

  // Non-passive so we can call preventDefault() to block CSS snap interference
  el.addEventListener('wheel', onWheel, { passive: false });

  return {
    destroy() {
      el.removeEventListener('wheel', onWheel, { passive: false });
      if (clearAccumTimer) clearTimeout(clearAccumTimer);
    }
  };
}
