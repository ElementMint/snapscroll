/**
 * @file fullpage.d.ts
 * @description Full TypeScript declarations for FullPage Engine v1.0.0
 */

// ─── Direction ────────────────────────────────────────────────────────────────

export type ScrollDirection = 'up' | 'down' | 'left' | 'right';

// ─── Event detail shapes ──────────────────────────────────────────────────────

export interface FPInitDetail {
  instance: FullPageEngine;
}

export interface FPLeaveDetail {
  origin:      HTMLElement;
  destination: HTMLElement;
  originIndex: number;
  destIndex:   number;
}

export interface FPLoadDetail {
  section: HTMLElement;
  index:   number;
  anchor:  string;
}

export interface FPSlideDetail {
  slideIndex: number;
  prevIndex:  number;
  section:    HTMLElement;
}

export interface FPResizeDetail {
  width:        number;
  height:       number;
  isResponsive: boolean;
}

// ─── Plugin interface ─────────────────────────────────────────────────────────

export interface FPPlugin {
  /** Unique plugin identifier. Duplicate names are rejected. */
  name: string;
  onInit?(ctx: { instance: FullPageEngine }): void;
  onLeave?(ctx: { section: HTMLElement; origin: number; dest: number }): void;
  onLoad?(ctx: { section: HTMLElement; index: number }): void;
  onSlideChange?(ctx: { slideIndex: number; section: HTMLElement }): void;
  onResize?(ctx: { width: number; height: number }): void;
  onDestroy?(ctx: { instance: FullPageEngine }): void;
}

// ─── Config ───────────────────────────────────────────────────────────────────

export interface FullPageConfig {
  // ── Navigation ──────────────────────────────────────────────────────────────
  /** URL hash anchors, one per section in order. @default [] */
  anchors: string[];

  /** Show side dot navigation. @default true */
  navigation: boolean;

  /** Side for the dot nav. @default 'right' */
  navigationPosition: 'left' | 'right';

  /** Tooltip label per dot. Also sets aria-label. @default [] */
  navigationTooltips: string[];

  /** Always show the active tooltip (not just on hover). @default false */
  showActiveTooltip: boolean;

  /** Show slide-level dots when a section has horizontal slides. @default true */
  slidesNavigation: boolean;

  // ── Behavior ────────────────────────────────────────────────────────────────
  /** Loop sections vertically (last → first). @default false */
  loop: boolean;

  /** Loop horizontal slides (last → first). @default false */
  loopSlides: boolean;

  /** Use CSS scroll snap for full-screen snapping. @default true */
  autoScrolling: boolean;

  /** Sections fill the full viewport height. @default true */
  fitToSection: boolean;

  /** Show native scrollbar. @default false */
  scrollBar: boolean;

  /** CSS easing for scrollIntoView transitions. @default 'cubic-bezier(0.645,0.045,0.355,1)' */
  easing: string;

  /** Cooldown in ms between section navigations. @default 700 */
  scrollingSpeed: number;

  /** Touch swipe sensitivity multiplier (minDistance = touchSensitivity * 3). @default 15 */
  touchSensitivity: number;

  /** CSS selector for elements that bypass section navigation. @default null */
  normalScrollElements: string | null;

  /** Enable arrow key / PageUp / PageDown navigation. @default true */
  keyboardScrolling: boolean;

  /** Animate when navigating via URL hash on page load. @default true */
  animateAnchor: boolean;

  /** Update browser history on section change. @default true */
  recordHistory: boolean;

  // ── Features ────────────────────────────────────────────────────────────────
  /** Lazy-load `data-fp-lazy-src` media via IntersectionObserver. @default true */
  lazyLoading: boolean;

  /** Show a 3px fixed progress bar at the top. @default false */
  progressBar: boolean;

  // ── Responsive ──────────────────────────────────────────────────────────────
  /** Disable scroll snap below this viewport width (0 = off). @default 0 */
  responsiveWidth: number;

  /** Disable scroll snap below this viewport height (0 = off). @default 0 */
  responsiveHeight: number;

  // ── Autoplay ────────────────────────────────────────────────────────────────
  /** Auto-advance horizontal slides. @default false */
  autoplay: boolean;

  /** Autoplay interval in ms. @default 5000 */
  autoplayInterval: number;

  // ── Integrations ────────────────────────────────────────────────────────────
  /** GSAP instance — passed to createGSAPPlugin automatically. @default null */
  gsap: object | null;

  /** Plugins to register on init. @default [] */
  plugins: FPPlugin[];

  // ── Callbacks ───────────────────────────────────────────────────────────────
  /** Fires once after the engine is fully ready. */
  onInit?(instance: FullPageEngine): void;

  /**
   * Fires before a section transition begins.
   * Return `false` to cancel the navigation.
   */
  beforeLeave?(
    origin:    HTMLElement,
    dest:      HTMLElement,
    direction: ScrollDirection
  ): boolean | void;

  /** Fires as the scroll transition starts. */
  onLeave?(
    origin:    HTMLElement,
    dest:      HTMLElement,
    destIndex: number
  ): void;

  /** Fires after the scroll transition completes. */
  afterLoad?(section: HTMLElement, index: number): void;

  /** Fires before a horizontal slide transition. */
  onSlideLeave?(
    section:     HTMLElement,
    originSlide: HTMLElement,
    destSlide:   HTMLElement
  ): void;

  /** Fires after a horizontal slide transition completes. */
  afterSlideLoad?(section: HTMLElement, slideIndex: number): void;

  /** Fires on viewport resize (debounced 200ms). */
  onResize?(detail: FPResizeDetail): void;
}

// ─── Main class ───────────────────────────────────────────────────────────────

export declare class FullPageEngine {
  constructor(
    selector:    string | HTMLElement,
    config?:     Partial<FullPageConfig>
  );

  // ── Navigation ──────────────────────────────────────────────────────────────

  /** Navigate to the next section. Respects `loop` config. */
  moveDown(): void;

  /** Navigate to the previous section. Respects `loop` config. */
  moveUp(): void;

  /**
   * Navigate to a section by zero-based index or anchor string.
   * @param target  Section index (0-based) or anchor string.
   * @param animate Whether to animate the transition. @default true
   */
  moveTo(target: number | string, animate?: boolean): void;

  /**
   * Navigate to a specific horizontal slide.
   * @param slideIndex   Zero-based slide index.
   * @param sectionIndex Target section (defaults to active section).
   */
  moveToSlide(slideIndex: number, sectionIndex?: number): void;

  // ── State ───────────────────────────────────────────────────────────────────

  /** Returns the zero-based index of the currently active section. */
  getActiveSection(): number;

  /**
   * Returns the zero-based index of the active slide in a section.
   * @param sectionIndex Defaults to the active section.
   */
  getActiveSlide(sectionIndex?: number): number;

  // ── Events ──────────────────────────────────────────────────────────────────

  /**
   * Subscribe to an internal event.
   * @returns Unsubscribe function.
   */
  on(
    event:   FPEventName,
    handler: (detail: FPEventDetailMap[FPEventName]) => void
  ): () => void;

  // ── Plugins ─────────────────────────────────────────────────────────────────

  /** Register a plugin. Duplicate names are rejected with a console warning. */
  use(plugin: FPPlugin): void;

  // ── Lifecycle ───────────────────────────────────────────────────────────────

  /**
   * Destroy and re-initialize in place — same config, fresh DOM scan.
   * Safe to call after AEM / SPA DOM mutations.
   */
  reinit(): void;

  /**
   * Full teardown: removes all listeners, observers, and injected DOM.
   * @param removeClasses Remove `.fp-wrapper` / `.fp-initialized` classes. @default true
   */
  destroy(removeClasses?: boolean): void;
}

// ─── Event map ────────────────────────────────────────────────────────────────

export type FPEventName =
  | 'fp:init'
  | 'fp:beforeLeave'
  | 'fp:onLeave'
  | 'fp:afterLoad'
  | 'fp:slideLoad'
  | 'fp:slideLeave'
  | 'fp:resize'
  | 'fp:destroy';

export interface FPEventDetailMap {
  'fp:init':        FPInitDetail;
  'fp:beforeLeave': FPLeaveDetail;
  'fp:onLeave':     FPLeaveDetail;
  'fp:afterLoad':   FPLoadDetail;
  'fp:slideLoad':   FPSlideDetail;
  'fp:slideLeave':  FPSlideDetail;
  'fp:resize':      FPResizeDetail;
  'fp:destroy':     FPInitDetail;
}

// ─── DOM custom event augmentation ───────────────────────────────────────────

declare global {
  interface HTMLElementEventMap {
    'fp:init':        CustomEvent<FPInitDetail>;
    'fp:beforeLeave': CustomEvent<FPLeaveDetail>;
    'fp:onLeave':     CustomEvent<FPLeaveDetail>;
    'fp:afterLoad':   CustomEvent<FPLoadDetail>;
    'fp:slideLoad':   CustomEvent<FPSlideDetail>;
    'fp:slideLeave':  CustomEvent<FPSlideDetail>;
    'fp:resize':      CustomEvent<FPResizeDetail>;
    'fp:destroy':     CustomEvent<FPInitDetail>;
  }
}

// ─── Plugin factories ─────────────────────────────────────────────────────────

/**
 * GSAP integration plugin.
 * Reads `data-gsap-from`, `data-gsap-to`, `data-gsap-delay` attributes
 * on children and builds a timeline on each section load.
 * @param gsap Your GSAP instance.
 */
export declare function createGSAPPlugin(gsap: object): FPPlugin;

/**
 * Lenis smooth scroll compatibility plugin.
 * Pauses Lenis during FullPage transitions and resumes on afterLoad.
 * @param lenis Your Lenis instance.
 */
export declare function createLenisPlugin(lenis: object): FPPlugin;

// ─── Auto-init helpers ────────────────────────────────────────────────────────

/** Auto-initialize all `[data-fp-auto]` elements. Skips AEM author mode. */
export declare function autoInit(): void;

/** Get the FullPageEngine instance for a container element. */
export declare function getInstance(
  elOrSelector: HTMLElement | string
): FullPageEngine | undefined;

/** Destroy all auto-initialized instances. */
export declare function destroyAll(): void;

export default FullPageEngine;
