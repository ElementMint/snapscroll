/**
 * @file plugins.js
 * @description Plugin architecture for FullPage Engine.
 * Plugins are plain objects with lifecycle hooks called by the engine.
 */

/**
 * @typedef {Object} FPPlugin
 * @property {string}   name            - Unique plugin name
 * @property {Function} [onInit]        - Called after engine init
 * @property {Function} [onDestroy]     - Called on engine destroy
 * @property {Function} [onLeave]       - Called before section leave
 * @property {Function} [onLoad]        - Called after section load
 * @property {Function} [onResize]      - Called on resize
 * @property {Function} [onSlideChange]- Called on slide change
 */

/**
 * Plugin registry and runner
 * @returns {Object}
 */
export function createPluginSystem() {
  /** @type {Map<string, FPPlugin>} */
  const _plugins = new Map();

  /**
   * Register a plugin
   * @param {FPPlugin} plugin
   */
  function register(plugin) {
    if (!plugin?.name) {
      console.warn('[FullPageEngine] Plugin must have a name');
      return;
    }
    if (_plugins.has(plugin.name)) {
      console.warn(`[FullPageEngine] Plugin "${plugin.name}" already registered`);
      return;
    }
    _plugins.set(plugin.name, plugin);
  }

  /**
   * Run a lifecycle hook across all registered plugins
   * @param {string}  hook    - Hook name (e.g. 'onInit')
   * @param {...any}  args
   */
  function run(hook, ...args) {
    _plugins.forEach(plugin => {
      if (typeof plugin[hook] === 'function') {
        try {
          plugin[hook](...args);
        } catch (e) {
          console.error(`[FullPageEngine] Plugin "${plugin.name}" threw in ${hook}:`, e);
        }
      }
    });
  }

  /**
   * Remove a plugin by name
   * @param {string} name
   */
  function unregister(name) {
    _plugins.delete(name);
  }

  /**
   * Clear all plugins
   */
  function clear() {
    _plugins.clear();
  }

  return { register, run, unregister, clear };
}

// ─── Built-in GSAP Integration Plugin ────────────────────────────────────────

/**
 * GSAP integration plugin factory.
 * Call this with your gsap instance to get a plugin that adds
 * GSAP timeline hooks to section transitions.
 * @param {Object} gsap - GSAP instance
 * @returns {FPPlugin}
 */
export function createGSAPPlugin(gsap) {
  return {
    name: 'gsap-integration',

    onLoad({ section, index }) {
      const tl = gsap.timeline();
      const animatables = section.querySelectorAll('[data-gsap-from]');

      animatables.forEach((el) => {
        const from  = JSON.parse(el.getAttribute('data-gsap-from')  || '{}');
        const to    = JSON.parse(el.getAttribute('data-gsap-to')    || '{}');
        const delay = parseFloat(el.getAttribute('data-gsap-delay') || '0');
        tl.fromTo(el, from, { ...to, delay });
      });

      return tl;
    },

    onLeave({ section }) {
      gsap.killTweensOf(section.querySelectorAll('[data-gsap-from]'));
    }
  };
}

// ─── Built-in Lenis Compatibility Plugin ────────────────────────────────────

/**
 * Lenis smooth scroll compatibility plugin.
 * Pauses Lenis during FullPage transitions.
 * @param {Object} lenis - Lenis instance
 * @returns {FPPlugin}
 */
export function createLenisPlugin(lenis) {
  return {
    name: 'lenis-compat',

    onLeave() {
      lenis?.stop();
    },

    onLoad() {
      // Resume after transition completes
      requestAnimationFrame(() => lenis?.start());
    }
  };
}
