/**
 * @file config.js
 * @description Default configuration and deep-merge helper for FullPage Engine
 */

/**
 * @typedef {Object} FullPageConfig
 * @property {string}   [anchors=[]]            - URL anchors for sections
 * @property {boolean}  [navigation=true]        - Show navigation dots
 * @property {string}   [navigationPosition='right'] - 'left' | 'right'
 * @property {boolean}  [navigationTooltips=true]- Show section tooltips on dots
 * @property {boolean}  [showActiveTooltip=false]- Always show active tooltip
 * @property {boolean}  [slidesNavigation=true]  - Show slide navigation
 * @property {boolean}  [loop=false]             - Infinite loop
 * @property {boolean}  [loopSlides=false]       - Infinite horizontal slides
 * @property {boolean}  [autoScrolling=true]     - Use CSS scroll snap
 * @property {boolean}  [fitToSection=true]      - Sections fill viewport
 * @property {boolean}  [scrollBar=false]        - Show native scrollbar
 * @property {boolean}  [easing='ease']          - Transition easing
 * @property {number}   [scrollingSpeed=700]     - Transition duration ms
 * @property {boolean}  [touchSensitivity=15]    - Touch sensitivity (px)
 * @property {boolean}  [normalScrollElements=null] - Selectors that allow natural scroll
 * @property {boolean}  [keyboardScrolling=true] - Enable keyboard navigation
 * @property {boolean}  [animateAnchor=true]     - Animate on anchor change
 * @property {boolean}  [recordHistory=true]     - Update browser history
 * @property {boolean}  [lazyLoading=true]       - Lazy load media
 * @property {boolean}  [responsiveWidth=0]      - Disable snap below px width
 * @property {boolean}  [responsiveHeight=0]     - Disable snap below px height
 * @property {boolean}  [progressBar=false]      - Show scroll progress bar
 * @property {boolean}  [autoplay=false]         - Autoplay slides
 * @property {number}   [autoplayInterval=5000]  - Autoplay interval ms
 * @property {Function} [onInit]                 - Called after init
 * @property {Function} [beforeLeave]            - Called before section leave
 * @property {Function} [onLeave]                - Called on section leave
 * @property {Function} [afterLoad]              - Called after section load
 * @property {Function} [onSlideLeave]           - Called on slide leave
 * @property {Function} [afterSlideLoad]         - Called after slide load
 */

export const DEFAULT_CONFIG = {
  anchors:               [],
  navigation:            true,
  navigationPosition:    'right',
  navigationTooltips:    [],
  showActiveTooltip:     false,
  slidesNavigation:      true,
  loop:                  false,
  loopSlides:            false,
  autoScrolling:         true,
  fitToSection:          true,
  scrollBar:             false,
  easing:                'cubic-bezier(0.645, 0.045, 0.355, 1.000)',
  scrollingSpeed:        700,
  touchSensitivity:      15,
  normalScrollElements:  null,
  keyboardScrolling:     true,
  animateAnchor:         true,
  recordHistory:         true,
  lazyLoading:           true,
  responsiveWidth:       0,
  responsiveHeight:      0,
  progressBar:           false,
  autoplay:              false,
  autoplayInterval:      5000,
  // GSAP integration hooks
  gsap:                  null,
  // Plugin system
  plugins:               [],
  // Callbacks
  onInit:                null,
  beforeLeave:           null,
  onLeave:               null,
  afterLoad:             null,
  onSlideLeave:          null,
  afterSlideLoad:        null,
  onResize:              null,
};

/**
 * Deep merge objects (config utility)
 * @param {Object} target
 * @param {Object} source
 * @returns {Object}
 */
export function mergeConfig(target, source) {
  const result = { ...target };
  for (const key of Object.keys(source)) {
    if (source[key] !== null && typeof source[key] === 'object' && !Array.isArray(source[key])) {
      result[key] = mergeConfig(target[key] || {}, source[key]);
    } else {
      result[key] = source[key];
    }
  }
  return result;
}

/**
 * Parse inline data-fp-config attribute from container element
 * @param {HTMLElement} el
 * @returns {Object}
 */
export function parseDataConfig(el) {
  try {
    const raw = el.getAttribute('data-fp-config');
    return raw ? JSON.parse(raw) : {};
  } catch (e) {
    console.warn('[FullPageEngine] Invalid data-fp-config JSON', e);
    return {};
  }
}
