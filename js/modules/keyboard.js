/**
 * @file keyboard.js
 * @description Keyboard navigation module.
 * Handles arrow keys, Page Up/Down, Home/End for section + slide navigation.
 * Respects focus trapping and natural scroll in overflow sections.
 */

import { KEYS } from '../core/constants.js';

/**
 * @typedef {Object} KeyboardHandler
 * @property {Function} enable  - Enable keyboard nav
 * @property {Function} disable - Disable keyboard nav
 * @property {Function} destroy - Remove all listeners
 */

/**
 * Create a keyboard navigation handler
 * @param {Object} callbacks
 * @param {Function} callbacks.moveUp
 * @param {Function} callbacks.moveDown
 * @param {Function} callbacks.moveLeft
 * @param {Function} callbacks.moveRight
 * @param {Function} callbacks.moveToFirst
 * @param {Function} callbacks.moveToLast
 * @returns {KeyboardHandler}
 */
export function createKeyboardHandler(callbacks) {
  let _enabled = true;

  function onKeyDown(e) {
    if (!_enabled) return;

    // Don't intercept when focus is in a form element or editable content
    const target = e.target;
    if (
      target.tagName === 'INPUT' ||
      target.tagName === 'TEXTAREA' ||
      target.tagName === 'SELECT' ||
      target.isContentEditable
    )
      return;

    // Don't intercept when focus is inside an fp-overflow scrollable
    if (target.closest?.('.fp-overflow')) return;

    const key = e.key;

    if (KEYS.DOWN.includes(key) || (key === ' ' && !e.shiftKey)) {
      e.preventDefault();
      callbacks.moveDown?.();
    } else if (KEYS.UP.includes(key) || (key === ' ' && e.shiftKey)) {
      e.preventDefault();
      callbacks.moveUp?.();
    } else if (KEYS.RIGHT.includes(key)) {
      callbacks.moveRight?.();
    } else if (KEYS.LEFT.includes(key)) {
      callbacks.moveLeft?.();
    } else if (KEYS.HOME.includes(key)) {
      e.preventDefault();
      callbacks.moveToFirst?.();
    } else if (KEYS.END.includes(key)) {
      e.preventDefault();
      callbacks.moveToLast?.();
    }
  }

  document.addEventListener('keydown', onKeyDown);

  return {
    enable() {
      _enabled = true;
    },
    disable() {
      _enabled = false;
    },
    destroy() {
      document.removeEventListener('keydown', onKeyDown);
    },
  };
}
