/**
 * @file FullPageEngine.js
 * @description Main FullPage Engine class.
 * Orchestrates all modules: scroll, touch, keyboard, navigation, lazy loading,
 * slides, accessibility, observers, plugins, and URL management.
 *
 * @version 1.0.0
 * @license MIT
 */

import { DEFAULT_CONFIG, mergeConfig, parseDataConfig } from './core/config.js';
import { createState } from './core/state.js';
import { createEventBus } from './core/events.js';
import { CLASSES, ATTRS, EVENTS, DIRECTION } from './core/constants.js';
import { $$, addClass, removeClass } from './utils/dom.js';
import { isAEMAuthorMode, prefersReducedMotion } from './utils/performance.js';
import { setHash, getHash, parseAnchor, normalizeAnchor } from './utils/url.js';
import { createTouchHandler } from './modules/touch.js';
import { createKeyboardHandler } from './modules/keyboard.js';
import { createWheelHandler } from './modules/wheel.js';
import { createNavigation, createProgressBar } from './modules/navigation.js';
import { initSectionSlides } from './modules/slides.js';
import { createLazyLoader } from './modules/lazyload.js';
import { createA11yModule, manageFocusOnSection } from './accessibility/accessibility.js';
import {
  createSectionObserver,
  createResizeObserver,
  createMutationObserver,
} from './observers/observers.js';
import { createPluginSystem } from './modules/plugins.js';

/**
 * @class FullPageEngine
 */
export class FullPageEngine {
  /**
   * @param {string|HTMLElement} selector - CSS selector or element
   * @param {Partial<FullPageConfig>} [userConfig={}]
   */
  constructor(selector, userConfig = {}) {
    /** @type {HTMLElement} */
    this._container = typeof selector === 'string' ? document.querySelector(selector) : selector;

    if (!this._container) {
      console.error('[FullPageEngine] Container element not found:', selector);
      return;
    }

    // Merge configs: defaults ← data-attribute ← JS options
    const dataConfig = parseDataConfig(this._container);
    this._config = mergeConfig(mergeConfig(DEFAULT_CONFIG, dataConfig), userConfig);

    this._state = createState();
    this._bus = createEventBus(this._container);
    this._plugins = createPluginSystem();

    // Module handles (for cleanup)
    this._touchHandler = null;
    this._keyboardHandler = null;
    this._wheelHandler = null;
    this._navigation = null;
    this._progressBar = null;
    this._lazyLoader = null;
    this._a11y = null;
    this._sectionObserver = null;
    this._resizeObserver = null;
    this._mutationObserver = null;
    this._slidesMap = new Map(); // sectionIndex → slides module
    this._cleanups = []; // array of cleanup functions
    this._programmaticNav = false; // true while a JS-driven scroll is in flight
    this._navTarget = -1; // intended destination during programmatic nav
    this._navGuardTimer = null; // timer ID for the programmatic nav guard
    this._pendingNav = null; // queued nav request during active scroll
    this._overflowLockUntil = 0; // timestamp until overflow inertia is blocked

    this._init();
  }

  // ─── Initialization ────────────────────────────────────────────────────────

  _init() {
    // Never initialize in AEM author mode
    if (isAEMAuthorMode()) {
      addClass(this._container, CLASSES.AUTHOR_MODE);
      console.info('[FullPageEngine] AEM author mode detected — skipping init.');
      return;
    }

    this._sections = $$(`.${CLASSES.SECTION}`, this._container);
    if (!this._sections.length) {
      console.warn('[FullPageEngine] No sections found.');
      return;
    }

    // Register user plugins
    this._config.plugins?.forEach(p => this._plugins.register(p));

    // Set up state
    this._state.set({
      totalSections: this._sections.length,
      activeSlides: new Array(this._sections.length).fill(0),
      totalSlides: this._sections.map(s => $$(`.${CLASSES.SLIDE}`, s).length || 1),
      reducedMotion: prefersReducedMotion(),
    });

    // Bootstrap modules
    this._setupContainer();
    this._setupSections();
    this._setupA11y();
    this._setupLazyLoader();
    this._setupSlides();
    this._setupNavigation();
    this._setupWheel();
    this._setupTouch();
    this._setupKeyboard();
    this._setupObservers();
    this._setupHashNavigation();

    // Mark as initialized
    addClass(this._container, CLASSES.INITIALIZED);
    this._state.set('initialized', true);

    // Resolve initial section from hash
    const hash = getHash();
    if (hash) {
      const { section: sAnchor } = parseAnchor(hash);
      const targetIdx = this._findSectionByAnchor(sAnchor);
      if (targetIdx !== -1) {
        this._scrollToSection(targetIdx, false);
      }
    }

    this._bus.emit(EVENTS.INIT, { instance: this });
    this._config.onInit?.(this);
    this._plugins.run('onInit', { instance: this });
  }

  // ─── Container & Section setup ─────────────────────────────────────────────

  _setupContainer() {
    addClass(this._container, CLASSES.WRAPPER);
  }

  _setupSections() {
    this._sections.forEach((section, i) => {
      // Ensure section class
      if (!section.classList.contains(CLASSES.SECTION)) {
        addClass(section, CLASSES.SECTION);
      }

      // Set anchor ID
      const anchor = this._config.anchors[i]
        ? normalizeAnchor(this._config.anchors[i])
        : section.getAttribute(ATTRS.ANCHOR) || normalizeAnchor(section.id) || `section-${i + 1}`;

      section.setAttribute(ATTRS.ANCHOR, anchor);
      if (!section.id) section.id = anchor;

      // Mark overflow/scrollable sections
      if (section.hasAttribute(ATTRS.OVERFLOW)) {
        addClass(section, CLASSES.OVERFLOW, CLASSES.SCROLLABLE);
        section.setAttribute('tabindex', '0');
      }

      // Activate first section
      if (i === 0) {
        addClass(section, CLASSES.ACTIVE);
      }
    });

    this._state.set('activeSection', 0);
  }

  // ─── Accessibility ─────────────────────────────────────────────────────────

  _setupA11y() {
    this._a11y = createA11yModule(this._container, this._sections);
    this._state.subscribe('activeSection', (newIdx, prevIdx) => {
      this._a11y.setActiveSection(newIdx, prevIdx);
    });
  }

  // ─── Lazy Loading ──────────────────────────────────────────────────────────

  _setupLazyLoader() {
    if (!this._config.lazyLoading) return;
    this._lazyLoader = createLazyLoader({ rootMargin: '300px 0px' });
    // Observe all sections immediately — IO handles timing
    this._sections.forEach(s => this._lazyLoader.observe(s));
  }

  // ─── Horizontal Slides ─────────────────────────────────────────────────────

  _setupSlides() {
    this._sections.forEach((section, i) => {
      const slideEls = $$(`.${CLASSES.SLIDE}`, section);
      if (!slideEls.length) return;

      const slides = initSectionSlides(section, {
        loop: this._config.loopSlides,
        autoplay: this._config.autoplay,
        autoplayInterval: this._config.autoplayInterval,
        eventBus: this._bus,
        onSlideChange: ({ prev, next }) => {
          const activeSlides = this._state.get('activeSlides');
          activeSlides[i] = next;
          this._state.set('activeSlides', [...activeSlides]);
          this._config.afterSlideLoad?.(section, next, prev);
        },
      });

      if (slides) this._slidesMap.set(i, slides);
    });
  }

  // ─── Navigation Dots ───────────────────────────────────────────────────────

  _setupNavigation() {
    if (!this._config.navigation) return;

    this._navigation = createNavigation({
      container: this._container,
      count: this._sections.length,
      tooltips: this._config.navigationTooltips,
      position: this._config.navigationPosition,
      onDotClick: index => this.moveTo(index),
    });

    // Keep dots in sync with state
    this._state.subscribe('activeSection', newIdx => {
      this._navigation?.update(newIdx);
    });

    // Progress bar
    if (this._config.progressBar) {
      this._progressBar = createProgressBar(this._container);
      this._state.subscribe('activeSection', newIdx => {
        const total = this._state.get('totalSections');
        this._progressBar.update(newIdx / Math.max(1, total - 1));
      });
    }
  }

  // ─── Wheel Handler ─────────────────────────────────────────────────────────

  _setupWheel() {
    this._wheelHandler = createWheelHandler(
      this._container,
      {
        onScrollDown: () => {
          const si = this._state.get('activeSection');
          const slides = this._slidesMap.get(si);
          if (slides) {
            const isLast = slides.activeIndex >= this._state.get('totalSlides')[si] - 1;
            if (!isLast) {
              slides.next();
              return;
            }
          }
          this.moveDown();
        },
        onScrollUp: () => {
          const si = this._state.get('activeSection');
          const slides = this._slidesMap.get(si);
          if (slides) {
            const isFirst = slides.activeIndex <= 0;
            if (!isFirst) {
              slides.prev();
              return;
            }
          }
          this.moveUp();
        },
      },
      {
        cooldown: this._config.scrollingSpeed + 100,
        // Prevent inertia bleed into overflow section content immediately
        // after a section transition lands on an overflow section.
        isOverflowLocked: () => this._overflowLockUntil > performance.now(),
      }
    );
    this._cleanups.push(() => this._wheelHandler?.destroy());
  }

  // ─── Touch Handler ─────────────────────────────────────────────────────────

  _setupTouch() {
    this._touchHandler = createTouchHandler(
      this._container,
      {
        onSwipeUp: () => {
          const si = this._state.get('activeSection');
          const slides = this._slidesMap.get(si);
          if (slides) {
            const isLast = slides.activeIndex >= this._state.get('totalSlides')[si] - 1;
            if (!isLast) {
              slides.next();
              return;
            }
          }
          this.moveDown();
        },
        onSwipeDown: () => {
          const si = this._state.get('activeSection');
          const slides = this._slidesMap.get(si);
          if (slides) {
            const isFirst = slides.activeIndex <= 0;
            if (!isFirst) {
              slides.prev();
              return;
            }
          }
          this.moveUp();
        },
        onSwipeLeft: () => this._moveSlideRight(),
        onSwipeRight: () => this._moveSlideLeft(),
      },
      { minDistance: this._config.touchSensitivity * 3 }
    );
    this._cleanups.push(() => this._touchHandler?.destroy());
  }

  // ─── Keyboard Handler ──────────────────────────────────────────────────────

  _setupKeyboard() {
    if (!this._config.keyboardScrolling) return;

    this._keyboardHandler = createKeyboardHandler({
      moveUp: () => this.moveUp(),
      moveDown: () => this.moveDown(),
      moveLeft: () => this._moveSlideLeft(),
      moveRight: () => this._moveSlideRight(),
      moveToFirst: () => this.moveTo(0),
      moveToLast: () => this.moveTo(this._sections.length - 1),
    });
    this._cleanups.push(() => this._keyboardHandler?.destroy());
  }

  // ─── Observers ─────────────────────────────────────────────────────────────

  _setupObservers() {
    // Active section detection — only act on native (user-driven) scroll.
    // During programmatic nav, suppress IO entirely so intermediate sections
    // (passed through during smooth scroll) don't flip the active state.
    // If the IO reports the exact nav target while _programmaticNav is still
    // true (rare timing), accept it as a no-op since state is already correct.
    this._sectionObserver = createSectionObserver(this._sections, activeIndex => {
      if (this._programmaticNav) return;
      if (activeIndex !== this._state.get('activeSection')) {
        this._activateSection(activeIndex);
      }
    });

    // Resize → responsive check
    this._resizeObserver = createResizeObserver(this._container, ({ width, height }) =>
      this._onResize(width, height)
    );

    // AEM / SPA dynamic content
    this._mutationObserver = createMutationObserver(this._container, () => this._onDOMChange());

    this._cleanups.push(
      () => this._sectionObserver?.destroy(),
      () => this._resizeObserver?.destroy(),
      () => this._mutationObserver?.destroy()
    );
  }

  // ─── Hash / URL Navigation ─────────────────────────────────────────────────

  _setupHashNavigation() {
    const onHashChange = () => {
      const hash = getHash();
      if (!hash) return;
      const { section: anchor } = parseAnchor(hash);
      const idx = this._findSectionByAnchor(anchor);
      if (idx !== -1 && idx !== this._state.get('activeSection')) {
        this._scrollToSection(idx, this._config.animateAnchor);
      }
    };

    window.addEventListener('hashchange', onHashChange);
    this._cleanups.push(() => window.removeEventListener('hashchange', onHashChange));
  }

  // ─── Scroll / Navigation API ───────────────────────────────────────────────

  /**
   * Move to next section
   */
  moveDown() {
    const current = this._state.get('activeSection');
    const total = this._state.get('totalSections');
    const next = current + 1;

    if (next >= total) {
      if (this._config.loop) this.moveTo(0);
      return;
    }
    this.moveTo(next);
  }

  /**
   * Move to previous section
   */
  moveUp() {
    const current = this._state.get('activeSection');
    const prev = current - 1;

    if (prev < 0) {
      if (this._config.loop) this.moveTo(this._sections.length - 1);
      return;
    }
    this.moveTo(prev);
  }

  /**
   * Move to a specific section by index or anchor string
   * @param {number|string} target - Section index or anchor
   * @param {boolean} [animate=true]
   */
  moveTo(target, animate = true) {
    const index = typeof target === 'string' ? this._findSectionByAnchor(target) : target;

    if (index < 0 || index >= this._sections.length) return;
    this._scrollToSection(index, animate);
  }

  /**
   * Move to a specific slide within current section
   * @param {number} slideIndex
   * @param {number} [sectionIndex] - Defaults to active
   */
  moveToSlide(slideIndex, sectionIndex) {
    const si = sectionIndex ?? this._state.get('activeSection');
    this._slidesMap.get(si)?.goTo(slideIndex);
  }

  // ─── Internal scroll logic ─────────────────────────────────────────────────

  _scrollToSection(index, animate = true) {
    // If mid-scroll, queue this request — it fires once the current scroll settles.
    // Only keep the most recent pending request (last wins).
    if (this._state.get('isScrolling')) {
      this._pendingNav = { index, animate };
      return;
    }
    this._pendingNav = null;

    if (
      index === this._state.get('activeSection') &&
      this._sections[index].classList.contains(CLASSES.ACTIVE)
    )
      return;

    const prev = this._state.get('activeSection');
    const section = this._sections[index];

    // Lifecycle: beforeLeave
    const continueNav = this._bus.emit(EVENTS.BEFORE_LEAVE, {
      origin: this._sections[prev],
      destination: section,
      originIndex: prev,
      destIndex: index,
    });
    if (!continueNav) return;

    this._config.beforeLeave?.(this._sections[prev], section, DIRECTION.DOWN);
    this._plugins.run('onLeave', {
      section: this._sections[prev],
      origin: prev,
      dest: index,
    });

    // Cancel any previous scroll guard timer before starting a new one
    if (this._navGuardTimer) {
      clearTimeout(this._navGuardTimer);
      this._navGuardTimer = null;
    }

    this._state.set('isScrolling', true);
    this._programmaticNav = true;
    this._navTarget = index;

    // Update active state immediately — IO is suppressed during programmatic nav
    this._activateSection(index);

    // Update URL
    if (this._config.recordHistory) {
      const anchor = section.getAttribute(ATTRS.ANCHOR);
      if (anchor) setHash(anchor, true);
    }

    // Lazy load adjacent sections
    this._lazyLoader?.observe(section);
    if (this._sections[index + 1]) this._lazyLoader?.observe(this._sections[index + 1]);
    if (this._sections[index - 1]) this._lazyLoader?.observe(this._sections[index - 1]);

    // Lifecycle: onLeave → afterLoad
    this._bus.emit(EVENTS.ON_LEAVE, {
      origin: this._sections[prev],
      dest: section,
      destIdx: index,
    });
    this._config.onLeave?.(this._sections[prev], section, index);

    // Scroll by setting scrollTop on the wrapper directly.
    // This is more reliable than scrollIntoView when navigating multiple sections:
    // scrollIntoView can fight with CSS scroll-snap on the container, causing a
    // visible snap-back flicker before the smooth animation wins.
    // scrollTo on the container moves smoothly without snap interference.
    const scrollBehavior = animate && !this._state.get('reducedMotion') ? 'smooth' : 'instant';
    this._container.scrollTo({
      top: section.offsetTop,
      behavior: scrollBehavior,
    });

    // Keep _programmaticNav true for the full scroll animation so the IO
    // cannot misfire on intermediate sections passed through during smooth scroll.
    // Use scrollingSpeed * 1.5 as the guard window to cover CSS snap fights.
    const speed = animate && !this._state.get('reducedMotion') ? this._config.scrollingSpeed : 0;
    this._navGuardTimer = setTimeout(
      () => {
        this._navGuardTimer = null;

        // Resync active section to the intended target — guards against any
        // CSS snap or stale IO callback that may have flipped it during transit.
        if (this._state.get('activeSection') !== index) {
          this._activateSection(index);
        }

        this._state.set('isScrolling', false);
        this._programmaticNav = false;
        this._navTarget = -1;

        this._bus.emit(EVENTS.AFTER_LOAD, {
          section,
          index,
          anchor: section.getAttribute(ATTRS.ANCHOR),
        });
        this._config.afterLoad?.(section, index);
        this._plugins.run('onLoad', { section, index });
        manageFocusOnSection(section);

        // Execute any navigation request that arrived while we were scrolling
        if (this._pendingNav) {
          const { index: pi, animate: pa } = this._pendingNav;
          this._pendingNav = null;
          this._scrollToSection(pi, pa);
        }
      },
      Math.max(speed * 1.5, speed + 200)
    );
  }

  _activateSection(index) {
    this._sections.forEach((s, i) => {
      s.classList.toggle(CLASSES.ACTIVE, i === index);
    });
    this._state.set('activeSection', index);

    // Reset overflow section to top so arriving users always see content
    // from the beginning, regardless of a previous visit's scroll position.
    // Also lock inertia scroll for scrollingSpeed+200ms so wheel momentum
    // from the section transition doesn't immediately scroll the content.
    const section = this._sections[index];
    if (section?.hasAttribute(ATTRS.OVERFLOW)) {
      section.scrollTop = 0;
      this._overflowLockUntil = performance.now() + (this._config.scrollingSpeed || 700) + 200;
    }
  }

  _moveSlideLeft() {
    const si = this._state.get('activeSection');
    this._slidesMap.get(si)?.prev();
  }

  _moveSlideRight() {
    const si = this._state.get('activeSection');
    this._slidesMap.get(si)?.next();
  }

  // ─── Resize & Responsive ───────────────────────────────────────────────────

  _onResize(width, height) {
    const { responsiveWidth, responsiveHeight } = this._config;
    const wasResponsive = this._state.get('isResponsive');
    const isResponsive =
      (responsiveWidth > 0 && width < responsiveWidth) ||
      (responsiveHeight > 0 && height < responsiveHeight);

    if (isResponsive !== wasResponsive) {
      this._state.set('isResponsive', isResponsive);
      this._container.classList.toggle('fp-responsive', isResponsive);
    }

    this._bus.emit(EVENTS.RESIZE, { width, height, isResponsive });
    this._config.onResize?.({ width, height, isResponsive });
    this._plugins.run('onResize', { width, height });
  }

  // ─── Dynamic DOM / AEM re-init ─────────────────────────────────────────────

  _onDOMChange() {
    const newSections = $$(`.${CLASSES.SECTION}`, this._container);
    if (newSections.length !== this._sections.length) {
      console.info('[FullPageEngine] DOM change detected — reinitializing.');
      this.reinit();
    }
  }

  // ─── Utilities ─────────────────────────────────────────────────────────────

  _findSectionByAnchor(anchor) {
    if (!anchor) return -1;
    const norm = normalizeAnchor(anchor);
    return this._sections.findIndex(
      s => normalizeAnchor(s.getAttribute(ATTRS.ANCHOR)) === norm || normalizeAnchor(s.id) === norm
    );
  }

  // ─── Public API ────────────────────────────────────────────────────────────

  /**
   * Get current active section index
   * @returns {number}
   */
  getActiveSection() {
    return this._state.get('activeSection');
  }

  /**
   * Get current active slide index for a section
   * @param {number} [sectionIndex]
   * @returns {number}
   */
  getActiveSlide(sectionIndex) {
    const si = sectionIndex ?? this._state.get('activeSection');
    const slides = this._state.get('activeSlides');
    return slides[si] ?? 0;
  }

  /**
   * Register a plugin at runtime
   * @param {import('./modules/plugins.js').FPPlugin} plugin
   */
  use(plugin) {
    this._plugins.register(plugin);
  }

  /**
   * Subscribe to events
   * @param {string}   event
   * @param {Function} handler
   * @returns {Function} unsubscribe
   */
  on(event, handler) {
    return this._bus.on(event, handler);
  }

  /**
   * Re-initialize (e.g. after AEM/SPA DOM update)
   */
  reinit() {
    this.destroy(false);
    this._init();
  }

  /**
   * Destroy the engine and clean up all listeners/observers/DOM
   * @param {boolean} [removeClasses=true]
   */
  destroy(removeClasses = true) {
    if (this._state.get('destroyed')) return;

    // Cancel any in-flight nav guard timer
    if (this._navGuardTimer) {
      clearTimeout(this._navGuardTimer);
      this._navGuardTimer = null;
    }

    // Stop autoplay
    this._slidesMap.forEach(slides => slides.destroy());
    this._slidesMap.clear();

    // Run all registered cleanups
    this._cleanups.forEach(fn => fn());
    this._cleanups.length = 0;

    // Destroy modules
    this._a11y?.destroy();
    this._navigation?.destroy();
    this._progressBar?.destroy();
    this._lazyLoader?.destroy();
    this._bus.destroy();
    this._plugins.run('onDestroy', { instance: this });
    this._plugins.clear();

    if (removeClasses) {
      removeClass(this._container, CLASSES.WRAPPER, CLASSES.INITIALIZED);
    }

    this._state.set('destroyed', true);
    this._bus.emit?.(EVENTS.DESTROY, { instance: this });
  }
}
