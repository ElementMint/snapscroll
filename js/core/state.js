/**
 * @file state.js
 * @description Centralized reactive state for FullPage Engine instance.
 * Uses a plain object with a simple subscription system — no external deps.
 */

/**
 * Creates an isolated state store for a FullPage instance.
 * @returns {Object} state store with get/set/subscribe
 */
export function createState() {
  let _state = {
    /** @type {number} Currently active section index (0-based) */
    activeSection: 0,

    /** @type {number[]} Currently active slide index per section */
    activeSlides: [],

    /** @type {number} Total section count */
    totalSections: 0,

    /** @type {number[]} Total slide count per section */
    totalSlides: [],

    /** @type {boolean} Currently mid-scroll transition */
    isScrolling: false,

    /** @type {boolean} Animations disabled (prefers-reduced-motion) */
    reducedMotion: false,

    /** @type {boolean} Is responsive (snap disabled) */
    isResponsive: false,

    /** @type {boolean} Was initialized */
    initialized: false,

    /** @type {boolean} Is destroyed */
    destroyed: false,

    /** @type {number|null} Autoplay timer ID */
    autoplayTimer: null,

    /** @type {number} Last wheel event timestamp */
    lastWheelTime: 0,

    /** @type {number} Last scroll timestamp */
    lastScrollTime: 0,
  };

  const _listeners = new Map();

  /**
   * Get a state value or the full state object
   * @param {string} [key]
   * @returns {*}
   */
  function get(key) {
    return key ? _state[key] : { ..._state };
  }

  /**
   * Set one or more state values
   * @param {string|Object} keyOrObj
   * @param {*} [value]
   */
  function set(keyOrObj, value) {
    const prev = { ..._state };
    if (typeof keyOrObj === 'object') {
      Object.assign(_state, keyOrObj);
    } else {
      _state[keyOrObj] = value;
    }
    _notify(prev, _state);
  }

  /**
   * Subscribe to state changes
   * @param {string|string[]} keys - key(s) to watch
   * @param {Function} cb - callback(newVal, oldVal, key)
   * @returns {Function} unsubscribe
   */
  function subscribe(keys, cb) {
    const keyList = Array.isArray(keys) ? keys : [keys];
    keyList.forEach(k => {
      if (!_listeners.has(k)) _listeners.set(k, new Set());
      _listeners.get(k).add(cb);
    });
    return () => keyList.forEach(k => _listeners.get(k)?.delete(cb));
  }

  function _notify(prev, next) {
    for (const [key, cbs] of _listeners) {
      if (prev[key] !== next[key]) {
        cbs.forEach(cb => cb(next[key], prev[key], key));
      }
    }
  }

  /**
   * Reset state to defaults
   */
  function reset() {
    _state = {
      activeSection:  0,
      activeSlides:   [],
      totalSections:  0,
      totalSlides:    [],
      isScrolling:    false,
      reducedMotion:  false,
      isResponsive:   false,
      initialized:    false,
      destroyed:      false,
      autoplayTimer:  null,
      lastWheelTime:  0,
      lastScrollTime: 0,
    };
    _listeners.clear();
  }

  return { get, set, subscribe, reset };
}
