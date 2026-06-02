/**
 * @file navigation.js
 * @description Navigation dots module.
 * Renders accessible dot navigation with optional tooltips.
 * Uses a single delegated click handler for performance.
 */

import { CLASSES }                       from '../core/constants.js';
import { createElement, addClass, removeClass, setAria } from '../utils/dom.js';

/**
 * @typedef {Object} NavigationModule
 * @property {Function} update  - Update active dot
 * @property {Function} destroy - Remove nav from DOM
 */

/**
 * Create and mount navigation dots
 * @param {Object} options
 * @param {HTMLElement}  options.container     - FullPage wrapper
 * @param {number}       options.count         - Section count
 * @param {string[]}     [options.tooltips=[]] - Tooltip labels per section
 * @param {string}       [options.position='right'] - 'left' | 'right'
 * @param {Function}     options.onDotClick    - Callback(index)
 * @returns {NavigationModule}
 */
export function createNavigation({ container, count, tooltips = [], position = 'right', onDotClick }) {
  const nav = createElement('nav', {
    class:      `${CLASSES.NAV} ${CLASSES.NAV}--${position}`,
    'aria-label': 'Section navigation',
    role:       'navigation',
  });

  const ul = createElement('ul', {
    role: 'list',
  });

  const dots = [];

  for (let i = 0; i < count; i++) {
    const tooltip = tooltips[i] || `Section ${i + 1}`;

    const btn = createElement('button', {
      class:        CLASSES.NAV_DOT,
      'aria-label': tooltip,
      'aria-current': i === 0 ? 'true' : 'false',
      role:         'tab',
      tabindex:     '0',
      'data-fp-index': String(i),
    });

    if (tooltips[i]) {
      const span = createElement('span', { class: 'fp-nav__tooltip', 'aria-hidden': 'true' }, tooltip);
      btn.appendChild(span);
    }

    const li = createElement('li', { role: 'presentation' }, btn);
    ul.appendChild(li);
    dots.push(btn);
  }

  nav.appendChild(ul);

  // Single delegated click handler
  function handleClick(e) {
    const btn = e.target.closest(`.${CLASSES.NAV_DOT}`);
    if (!btn) return;
    const index = parseInt(btn.getAttribute('data-fp-index'), 10);
    if (!isNaN(index)) onDotClick(index);
  }

  nav.addEventListener('click', handleClick);
  // Append to body, not the scroll container — position:fixed inside a scroll
  // container is positioned relative to that container, not the viewport.
  document.body.appendChild(nav);

  // Set first dot active
  if (dots[0]) {
    addClass(dots[0], CLASSES.NAV_DOT_ACTIVE);
  }

  return {
    /**
     * Update active dot
     * @param {number} index
     */
    update(index) {
      dots.forEach((dot, i) => {
        const isActive = i === index;
        dot.classList.toggle(CLASSES.NAV_DOT_ACTIVE, isActive);
        setAria(dot, 'current', isActive ? 'true' : 'false');
      });
    },

    /**
     * Remove nav from DOM and clean up
     */
    destroy() {
      nav.removeEventListener('click', handleClick);
      nav.remove();
    }
  };
}

/**
 * Create progress bar indicator
 * @param {HTMLElement} container
 * @returns {{ update(pct: number): void, destroy(): void }}
 */
export function createProgressBar(container) {
  const bar = createElement('div', { class: CLASSES.PROGRESS });
  const fill = createElement('div', { class: CLASSES.PROGRESS_BAR, 'aria-hidden': 'true' });
  bar.appendChild(fill);
  document.body.appendChild(bar);

  return {
    update(percent) {
      fill.style.transform = `scaleX(${Math.max(0, Math.min(1, percent))})`;
    },
    destroy() {
      bar.remove();
    }
  };
}
