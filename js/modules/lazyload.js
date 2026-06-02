/**
 * @file lazyload.js
 * @description Lazy loading module using IntersectionObserver.
 * Loads images, videos, and iframes as sections enter viewport.
 * Supports data-fp-lazy-src and data-fp-lazy-srcset attributes.
 */

import { ATTRS, CLASSES }  from '../core/constants.js';

/**
 * @typedef {Object} LazyLoader
 * @property {Function} observe   - Observe a new element
 * @property {Function} unobserve - Stop observing an element
 * @property {Function} destroy   - Disconnect observer
 */

/**
 * Create a lazy loader instance
 * @param {Object} [options={}]
 * @param {number} [options.rootMargin='200px'] - Pre-load margin
 * @param {number} [options.threshold=0]
 * @returns {LazyLoader}
 */
export function createLazyLoader(options = {}) {
  const {
    rootMargin = '200px 0px',
    threshold  = 0,
  } = options;

  // Media elements we can lazy-load
  const MEDIA_TAGS = new Set(['IMG', 'VIDEO', 'SOURCE', 'IFRAME']);

  /**
   * Load a media element
   * @param {HTMLElement} el
   */
  function loadElement(el) {
    const lazySrc    = el.getAttribute(ATTRS.LAZY_SRC);
    const lazySrcset = el.getAttribute(ATTRS.LAZY_SRCSET);

    if (lazySrc) {
      if (MEDIA_TAGS.has(el.tagName)) {
        el.src = lazySrc;
      } else {
        el.style.backgroundImage = `url('${lazySrc}')`;
      }
      el.removeAttribute(ATTRS.LAZY_SRC);
    }

    if (lazySrcset && (el.tagName === 'IMG' || el.tagName === 'SOURCE')) {
      el.srcset = lazySrcset;
      el.removeAttribute(ATTRS.LAZY_SRCSET);
    }

    el.classList.add(CLASSES.LAZY_LOADED);
    el.classList.remove(CLASSES.LAZY);
  }

  /**
   * Recursively find all lazy elements inside a container
   * @param {HTMLElement} container
   * @returns {HTMLElement[]}
   */
  function findLazyElements(container) {
    const byClass = Array.from(container.querySelectorAll(`.${CLASSES.LAZY}`));
    const byAttr  = Array.from(container.querySelectorAll(`[${ATTRS.LAZY_SRC}]`));
    // Deduplicate
    return [...new Set([...byClass, ...byAttr])];
  }

  // Check for IntersectionObserver support
  if (!('IntersectionObserver' in window)) {
    // Fallback: load everything immediately
    return {
      observe(root) {
        findLazyElements(root).forEach(loadElement);
      },
      unobserve() {},
      destroy()   {},
    };
  }

  const observer = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      const el = entry.target;
      loadElement(el);
      observer.unobserve(el);
    }
  }, { rootMargin, threshold });

  return {
    /**
     * Observe all lazy elements inside a root element
     * @param {HTMLElement} root
     */
    observe(root) {
      findLazyElements(root).forEach(el => observer.observe(el));
    },

    /**
     * Unobserve a specific element
     * @param {HTMLElement} el
     */
    unobserve(el) {
      observer.unobserve(el);
    },

    /**
     * Disconnect and stop all observation
     */
    destroy() {
      observer.disconnect();
    }
  };
}
