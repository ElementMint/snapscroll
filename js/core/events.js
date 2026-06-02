/**
 * @file events.js
 * @description Lightweight event bus with DOM custom event bridging.
 * Supports both internal pub/sub and DOM-level CustomEvent dispatch.
 */

/**
 * Creates an event bus tied to a specific DOM element (the wrapper)
 * @param {HTMLElement} el - Root element for CustomEvent dispatch
 * @returns {Object}
 */
export function createEventBus(el) {
  /** @type {Map<string, Set<Function>>} */
  const _handlers = new Map();

  /**
   * Subscribe to an internal event
   * @param {string} event
   * @param {Function} handler
   * @returns {Function} unsubscribe
   */
  function on(event, handler) {
    if (!_handlers.has(event)) _handlers.set(event, new Set());
    _handlers.get(event).add(handler);
    return () => off(event, handler);
  }

  /**
   * Unsubscribe from an internal event
   * @param {string} event
   * @param {Function} handler
   */
  function off(event, handler) {
    _handlers.get(event)?.delete(handler);
  }

  /**
   * Emit an internal event and dispatch a DOM CustomEvent
   * @param {string} event
   * @param {Object} [detail={}]
   * @returns {boolean} false if any handler returned false (cancellable)
   */
  function emit(event, detail = {}) {
    let cancelled = false;

    // Internal handlers
    _handlers.get(event)?.forEach(fn => {
      const result = fn(detail);
      if (result === false) cancelled = true;
    });

    // DOM-level custom event for external consumers
    if (el) {
      const domEvent = new CustomEvent(event, {
        bubbles:    true,
        cancelable: true,
        detail,
      });
      el.dispatchEvent(domEvent);
      if (domEvent.defaultPrevented) cancelled = true;
    }

    return !cancelled;
  }

  /**
   * One-time subscription
   * @param {string} event
   * @param {Function} handler
   * @returns {Function} unsubscribe
   */
  function once(event, handler) {
    const wrapped = (detail) => {
      handler(detail);
      off(event, wrapped);
    };
    return on(event, wrapped);
  }

  /**
   * Remove all handlers (cleanup)
   */
  function destroy() {
    _handlers.clear();
  }

  return { on, off, emit, once, destroy };
}
