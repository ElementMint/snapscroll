/**
 * @file constants.js
 * @description Global constants for the FullPage engine
 */

export const LIBRARY_NAME = 'FullPageEngine';
export const VERSION = '1.0.0';

/** CSS class names */
export const CLASSES = {
  WRAPPER:        'fp-wrapper',
  SECTION:        'fp-section',
  SLIDE:          'fp-slide',
  SLIDE_CONTAINER:'fp-slides',
  ACTIVE:         'fp-active',
  PREV:           'fp-prev',
  LEAVING:        'fp-leaving',
  OVERFLOW:       'fp-overflow',
  SCROLLABLE:     'fp-scrollable',
  LAZY:           'fp-lazy',
  LAZY_LOADED:    'fp-lazy-loaded',
  REDUCED_MOTION: 'fp-reduced-motion',
  ANIMATING:      'fp-animating',
  INITIALIZED:    'fp-initialized',
  AUTHOR_MODE:    'fp-author-mode',
  NAV:            'fp-nav',
  NAV_DOT:        'fp-nav__dot',
  NAV_DOT_ACTIVE: 'fp-nav__dot--active',
  PROGRESS:       'fp-progress',
  PROGRESS_BAR:   'fp-progress__bar',
};

/** Data attributes */
export const ATTRS = {
  SECTION:        'data-fp-section',
  SLIDE:          'data-fp-slide',
  ANCHOR:         'data-fp-anchor',
  LAZY_SRC:       'data-fp-lazy-src',
  LAZY_SRCSET:    'data-fp-lazy-srcset',
  OVERFLOW:       'data-fp-overflow',
  AUTO_HEIGHT:    'data-fp-auto-height',
  CONFIG:         'data-fp-config',
};

/** Custom events */
export const EVENTS = {
  BEFORE_LEAVE:   'fp:beforeLeave',
  AFTER_LOAD:     'fp:afterLoad',
  ON_LEAVE:       'fp:onLeave',
  SLIDE_LEAVE:    'fp:slideLeave',
  SLIDE_LOAD:     'fp:slideLoad',
  RESIZE:         'fp:resize',
  SCROLL:         'fp:scroll',
  INIT:           'fp:init',
  DESTROY:        'fp:destroy',
};

/** Navigation directions */
export const DIRECTION = {
  UP:    'up',
  DOWN:  'down',
  LEFT:  'left',
  RIGHT: 'right',
};

/** Keyboard keycodes */
export const KEYS = {
  UP:        ['ArrowUp',    'PageUp'],
  DOWN:      ['ArrowDown',  'PageDown'],
  LEFT:      ['ArrowLeft'],
  RIGHT:     ['ArrowRight'],
  HOME:      ['Home'],
  END:       ['End'],
  SPACE:     [' '],
  ENTER:     ['Enter'],
};

/** Touch/swipe thresholds */
export const TOUCH = {
  MIN_SWIPE_DISTANCE: 50,
  MAX_SWIPE_TIME:     800,
  ANGLE_THRESHOLD:    30,
};

/** Wheel scroll thresholds */
export const WHEEL = {
  DELTA_THRESHOLD:    20,
  COOLDOWN_MS:        800,
};
