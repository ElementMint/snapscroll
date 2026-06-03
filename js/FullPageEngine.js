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
import { CLASSES, ATTRS, EVENTS, DIRECTION, RAIL_CLASS } from './core/constants.js';
import { $$, addClass, removeClass, createElement } from './utils/dom.js';
import { isAEMAuthorMode, prefersReducedMotion } from './utils/performance.js';
import { setHash, getHash, parseAnchor, normalizeAnchor } from './utils/url.js';
import { createTouchHandler } from './modules/touch.js';
import { createKeyboardHandler } from './modules/keyboard.js';
import { createWheelHandler } from './modules/wheel.js';
import { createNavigation, createProgressBar } from './modules/navigation.js';
import { initSectionSlides } from './modules/slides.js';
import { createLazyLoader } from './modules/lazyload.js';
import { createA11yModule, manageFocusOnSection } from './accessibility/accessibility.js';
import { createResizeObserver, createMutationObserver } from './observers/observers.js';
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
    this._cleanups = []; // cleanup functions
    this._rafId = null; // active rAF animation id
    this._currentY = 0; // current rail translateY in px
    this._pendingNav = null; // nav queued during active scroll
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

    // Create the rail — a single div that all sections live in.
    // JS animates its transform to scroll between sections.
    this._rail = createElement('div', { class: RAIL_CLASS });
    this._container.appendChild(this._rail);
  }

  _setupSections() {
    this._sections.forEach((section, i) => {
      if (!section.classList.contains(CLASSES.SECTION)) {
        addClass(section, CLASSES.SECTION);
      }

      const anchor = this._config.anchors[i]
        ? normalizeAnchor(this._config.anchors[i])
        : section.getAttribute(ATTRS.ANCHOR) || normalizeAnchor(section.id) || `section-${i + 1}`;

      section.setAttribute(ATTRS.ANCHOR, anchor);
      if (!section.id) section.id = anchor;

      if (section.hasAttribute(ATTRS.OVERFLOW)) {
        addClass(section, CLASSES.OVERFLOW, CLASSES.SCROLLABLE);
        section.setAttribute('tabindex', '0');
      }

      this._rail.appendChild(section);

      if (i === 0) addClass(section, CLASSES.ACTIVE);
    });

    // When loop is enabled, clone the first and last sections as bookends.
    // Rail layout: [clone-last | sec0 | sec1 | … | secN | clone-first]
    // The rail starts at translateY(-h) so sec0 is visible.
    // Loop wrap: animate into the clone, snap back to the real section — no blank.
    if (this._config.loop && this._sections.length > 1) {
      const cloneFirst = this._sections[0].cloneNode(true);
      const cloneLast = this._sections[this._sections.length - 1].cloneNode(true);
      cloneFirst.setAttribute('aria-hidden', 'true');
      cloneLast.setAttribute('aria-hidden', 'true');
      cloneFirst.removeAttribute('id');
      cloneLast.removeAttribute('id');
      this._rail.appendChild(cloneFirst); // after last real section
      this._rail.insertBefore(cloneLast, this._rail.firstChild); // before first
      this._loopOffset = 1; // real sections start at rail index 1
    } else {
      this._loopOffset = 0;
    }

    const railSections = this._loopOffset ? this._sections.length + 2 : this._sections.length;
    this._rail.style.height = `${railSections * 100}svh`;

    // Start at the first real section (skip prepended clone if looping)
    const startY = -(this._loopOffset * this._container.clientHeight);
    this._currentY = startY;
    this._rail.style.transform = `translateY(${startY}px)`;

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
    // Section position is fully owned by the rAF animation engine —
    // no IntersectionObserver needed for active-section detection.

    // Resize → recalculate rail position so sections stay aligned
    this._resizeObserver = createResizeObserver(this._container, ({ width, height }) =>
      this._onResize(width, height)
    );

    // AEM / SPA dynamic content
    this._mutationObserver = createMutationObserver(this._container, () => this._onDOMChange());

    this._cleanups.push(
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

  // Built-in easing presets. t = normalized time 0..1, returns eased 0..1.
  static _easings = {
    easeInOutCubic: t => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
    easeInOutQuart: t => (t < 0.5 ? 8 * t * t * t * t : 1 - Math.pow(-2 * t + 2, 4) / 2),
    easeInOutSine: t => -(Math.cos(Math.PI * t) - 1) / 2,
    easeOutCubic: t => 1 - Math.pow(1 - t, 3),
    easeOutQuart: t => 1 - Math.pow(1 - t, 4),
    easeOutExpo: t => (t === 1 ? 1 : 1 - Math.pow(2, -10 * t)),
    linear: t => t,
  };

  // Resolve config.easing to a callable function.
  // Accepts: preset name string, or raw function.
  _buildEaseFn() {
    const e = this._config.easing;
    if (typeof e === 'function') return e;
    return FullPageEngine._easings[e] ?? FullPageEngine._easings['easeInOutCubic'];
  }

  _scrollToSection(index, animate = true) {
    if (this._state.get('isScrolling')) {
      this._pendingNav = { index, animate };
      return;
    }
    this._pendingNav = null;

    if (
      index === this._state.get('activeSection') &&
      this._sections[index].classList.contains(CLASSES.ACTIVE)
    ) {
      return;
    }

    const prev = this._state.get('activeSection');
    const section = this._sections[index];

    const continueNav = this._bus.emit(EVENTS.BEFORE_LEAVE, {
      origin: this._sections[prev],
      destination: section,
      originIndex: prev,
      destIndex: index,
    });
    if (!continueNav) return;

    this._config.beforeLeave?.(this._sections[prev], section, DIRECTION.DOWN);
    this._plugins.run('onLeave', { section: this._sections[prev], origin: prev, dest: index });

    // Cancel any in-flight animation
    if (this._rafId) {
      cancelAnimationFrame(this._rafId);
      this._rafId = null;
    }

    this._state.set('isScrolling', true);
    this._activateSection(index);

    if (this._config.recordHistory) {
      const anchor = section.getAttribute(ATTRS.ANCHOR);
      if (anchor) setHash(anchor, true);
    }

    this._lazyLoader?.observe(section);
    if (this._sections[index + 1]) this._lazyLoader?.observe(this._sections[index + 1]);
    if (this._sections[index - 1]) this._lazyLoader?.observe(this._sections[index - 1]);

    this._bus.emit(EVENTS.ON_LEAVE, {
      origin: this._sections[prev],
      dest: section,
      destIdx: index,
    });
    this._config.onLeave?.(this._sections[prev], section, index);

    const shouldAnimate = animate && !this._state.get('reducedMotion');
    const duration = shouldAnimate ? this._config.scrollingSpeed : 0;
    const easeFn = this._buildEaseFn();
    const h = this._container.clientHeight;
    const total = this._sections.length;
    const off = this._loopOffset ?? 0;

    // Real section positions account for the clone prepended at index 0 of the rail.
    // section[i] sits at rail row (off + i), so translateY = -((off + i) * h).
    const realY = -((off + index) * h);
    const fromY = this._currentY ?? -off * h;
    let toY = realY;

    // Loop wrap: animate into the adjacent clone (which looks identical to the
    // real destination), then snap the rail to the real section position.
    // No blank frames because the clone fills the space the animation travels through.
    const isLooping = this._config.loop && off > 0;
    const goingDown = index === 0 && prev === total - 1; // last → clone-first
    const goingUp = index === total - 1 && prev === 0; // first → clone-last

    if (isLooping && goingDown && shouldAnimate) {
      // Clone of first is appended after last real section
      toY = -((off + total) * h);
    } else if (isLooping && goingUp && shouldAnimate) {
      // Clone of last is prepended before first real section (rail index 0)
      toY = 0;
    }

    const onDone = () => {
      this._rafId = null;
      // Snap to real section — invisible because clone looks identical
      this._currentY = realY;
      this._rail.style.transform = `translateY(${realY}px)`;
      this._state.set('isScrolling', false);

      this._bus.emit(EVENTS.AFTER_LOAD, {
        section,
        index,
        anchor: section.getAttribute(ATTRS.ANCHOR),
      });
      this._config.afterLoad?.(section, index);
      this._plugins.run('onLoad', { section, index });
      manageFocusOnSection(section);

      if (this._pendingNav) {
        const { index: pi, animate: pa } = this._pendingNav;
        this._pendingNav = null;
        this._scrollToSection(pi, pa);
      }
    };

    if (!shouldAnimate) {
      onDone();
      return;
    }

    const startTime = performance.now();

    const tick = now => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const y = fromY + (toY - fromY) * easeFn(progress);

      this._rail.style.transform = `translateY(${y}px)`;

      if (progress < 1) {
        this._rafId = requestAnimationFrame(tick);
      } else {
        onDone();
      }
    };

    this._rafId = requestAnimationFrame(tick);
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

    // Recalculate rail position — section heights are viewport-relative (100svh),
    // so after a resize the active section must be repositioned instantly.
    const idx = this._state.get('activeSection');
    const off = this._loopOffset ?? 0;
    this._currentY = -((off + idx) * this._container.clientHeight);
    if (this._rail) this._rail.style.transform = `translateY(${this._currentY}px)`;

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

    // Cancel any in-flight rAF scroll animation
    if (this._rafId) {
      cancelAnimationFrame(this._rafId);
      this._rafId = null;
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

    // Move sections back out of the rail and remove the rail
    if (this._rail) {
      this._sections?.forEach(s => this._container.appendChild(s));
      this._rail.remove();
      this._rail = null;
    }

    this._state.set('destroyed', true);
    this._bus.emit?.(EVENTS.DESTROY, { instance: this });
  }
}
