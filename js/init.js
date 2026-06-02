/**
 * @file init.js
 * @description Public entry point for FullPage Engine.
 * Supports manual instantiation and auto-initialization via data attributes.
 * AEM-safe: checks for author mode before doing anything.
 *
 * @example
 * // Manual init
 * import { FullPageEngine } from './init.js';
 * const fp = new FullPageEngine('#my-container', { navigation: true });
 *
 * @example
 * // Data-attribute auto-init (no JS required)
 * <div id="fp" data-fp-auto data-fp-config='{"loop":true}'>
 */

import { FullPageEngine }    from './FullPageEngine.js';
import { isAEMAuthorMode }   from './utils/performance.js';
import { createGSAPPlugin, createLenisPlugin } from './modules/plugins.js';

export { FullPageEngine };
export { createGSAPPlugin, createLenisPlugin };
export * from './core/constants.js';

/** @type {Map<HTMLElement, FullPageEngine>} Active instances */
const _instances = new Map();

/**
 * Auto-initialize elements with [data-fp-auto] attribute.
 * Safe to call multiple times — skips already-initialized elements.
 */
export function autoInit() {
  if (isAEMAuthorMode()) return;

  document.querySelectorAll('[data-fp-auto]').forEach(el => {
    if (_instances.has(el)) return;
    const instance = new FullPageEngine(el);
    _instances.set(el, instance);
  });
}

/**
 * Get the FullPageEngine instance for an element
 * @param {HTMLElement|string} elOrSelector
 * @returns {FullPageEngine|undefined}
 */
export function getInstance(elOrSelector) {
  const el = typeof elOrSelector === 'string'
    ? document.querySelector(elOrSelector)
    : elOrSelector;
  return _instances.get(el);
}

/**
 * Destroy all auto-initialized instances
 */
export function destroyAll() {
  _instances.forEach(instance => instance.destroy());
  _instances.clear();
}

// ─── Auto-init on DOMContentLoaded ───────────────────────────────────────────
// Only fires if not in AEM author mode and document is not already interactive

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', autoInit, { once: true });
} else {
  // DOM already ready (e.g. script deferred)
  autoInit();
}

// ─── AEM SPA / Editable Page refresh support ─────────────────────────────────
// Listen for AEM editor channel messages to re-initialize after page edits

if (typeof window !== 'undefined' && window.Granite?.author) {
  // Re-init on component refresh in AEM SPA Editor
  document.addEventListener('cq-editor-loaded', () => {
    if (isAEMAuthorMode()) return;
    destroyAll();
    autoInit();
  });
}

export default FullPageEngine;
