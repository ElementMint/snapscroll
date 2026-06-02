/**
 * @file touch.js
 * @description Touch gesture detection module.
 * Uses passive listeners for maximum scroll performance.
 * Supports swipe direction detection with angle threshold filtering.
 */

import { PASSIVE_OPTS, isTouchDevice } from '../utils/performance.js';
import { TOUCH } from '../core/constants.js';

/**
 * @typedef {Object} TouchHandler
 * @property {Function} destroy - Remove all listeners
 */

/**
 * Attach touch gesture handling to an element
 * @param {HTMLElement} el
 * @param {Object} callbacks
 * @param {Function} callbacks.onSwipeUp
 * @param {Function} callbacks.onSwipeDown
 * @param {Function} callbacks.onSwipeLeft
 * @param {Function} callbacks.onSwipeRight
 * @param {Object}   [options={}]
 * @param {number}   [options.minDistance=50]
 * @param {number}   [options.maxTime=800]
 * @param {number}   [options.angleThreshold=30]
 * @returns {TouchHandler}
 */
export function createTouchHandler(el, callbacks, options = {}) {
  const {
    minDistance = TOUCH.MIN_SWIPE_DISTANCE,
    maxTime = TOUCH.MAX_SWIPE_TIME,
    angleThreshold = TOUCH.ANGLE_THRESHOLD,
  } = options;

  let startX = 0;
  let startY = 0;
  let startTime = 0;
  let isSwiping = false;

  /**
   * @param {TouchEvent} e
   */
  function onTouchStart(e) {
    if (e.touches.length > 1) return; // ignore multi-touch
    const t = e.touches[0];
    startX = t.clientX;
    startY = t.clientY;
    startTime = performance.now();
    isSwiping = true;
  }

  /**
   * @param {TouchEvent} e
   */
  function onTouchMove(_e) {
    if (!isSwiping) return;
  }

  /**
   * @param {TouchEvent} e
   */
  function onTouchEnd(e) {
    if (!isSwiping) return;
    isSwiping = false;

    const elapsed = performance.now() - startTime;
    if (elapsed > maxTime) return;

    const t = e.changedTouches[0];
    const deltaX = t.clientX - startX;
    const deltaY = t.clientY - startY;
    const absX = Math.abs(deltaX);
    const absY = Math.abs(deltaY);
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

    if (distance < minDistance) return;

    // Calculate angle from horizontal
    const angle = Math.atan2(absY, absX) * (180 / Math.PI);

    if (angle < angleThreshold) {
      // Horizontal swipe
      if (deltaX < 0) {
        callbacks.onSwipeLeft?.({ deltaX, deltaY, distance });
      } else {
        callbacks.onSwipeRight?.({ deltaX, deltaY, distance });
      }
    } else if (angle > 90 - angleThreshold) {
      // Vertical swipe
      if (deltaY < 0) {
        callbacks.onSwipeUp?.({ deltaX, deltaY, distance });
      } else {
        callbacks.onSwipeDown?.({ deltaX, deltaY, distance });
      }
    }
  }

  function onTouchCancel() {
    isSwiping = false;
  }

  // Only attach on real touch devices
  if (!isTouchDevice()) {
    return { destroy: () => {} };
  }

  el.addEventListener('touchstart', onTouchStart, PASSIVE_OPTS);
  el.addEventListener('touchmove', onTouchMove, PASSIVE_OPTS);
  el.addEventListener('touchend', onTouchEnd, PASSIVE_OPTS);
  el.addEventListener('touchcancel', onTouchCancel, PASSIVE_OPTS);

  return {
    destroy() {
      el.removeEventListener('touchstart', onTouchStart, PASSIVE_OPTS);
      el.removeEventListener('touchmove', onTouchMove, PASSIVE_OPTS);
      el.removeEventListener('touchend', onTouchEnd, PASSIVE_OPTS);
      el.removeEventListener('touchcancel', onTouchCancel, PASSIVE_OPTS);
    },
  };
}
