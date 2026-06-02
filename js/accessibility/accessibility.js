/**
 * @file accessibility.js
 * @description Accessibility module.
 * Manages focus, ARIA live regions, reduced motion, skip links,
 * and screen reader announcements for section transitions.
 */

import { createElement } from '../utils/dom.js';
import { prefersReducedMotion } from '../utils/performance.js';

/**
 * @typedef {Object} A11yModule
 * @property {Function} announce        - Announce text to screen readers
 * @property {Function} setActiveSection - Update ARIA state for active section
 * @property {Function} checkMotion     - Check + apply reduced motion state
 * @property {Function} destroy         - Cleanup
 */

/**
 * Create the accessibility module
 * @param {HTMLElement} container  - FullPage wrapper
 * @param {HTMLElement[]} sections - Section elements
 * @returns {A11yModule}
 */
export function createA11yModule(container, sections) {
  // ARIA live region for announcements
  const liveRegion = createElement('div', {
    class: 'fp-sr-only',
    'aria-live': 'polite',
    'aria-atomic': 'true',
    'aria-relevant': 'additions',
    role: 'status',
  });
  document.body.appendChild(liveRegion);

  // Add skip link
  const skipLink = createElement(
    'a',
    {
      href: '#fp-main-content',
      class: 'fp-skip-link',
    },
    'Skip to main content'
  );
  document.body.insertBefore(skipLink, document.body.firstChild);

  // Set section ARIA roles and initial states
  sections.forEach((section, i) => {
    if (!section.hasAttribute('role')) {
      section.setAttribute('role', 'region');
    }
    if (!section.hasAttribute('aria-label')) {
      const heading = section.querySelector('h1,h2,h3,h4,h5,h6');
      const label = heading?.textContent?.trim() || `Section ${i + 1}`;
      section.setAttribute('aria-label', label);
    }
    // Initially hide non-active sections from screen readers
    if (i !== 0) {
      section.setAttribute('aria-hidden', 'true');
    }
    // Ensure each section is focusable for skip-link targets
    if (!section.hasAttribute('tabindex')) {
      section.setAttribute('tabindex', '-1');
    }
  });

  // Add main content ID to first section
  if (sections[0]) {
    sections[0].id = sections[0].id || 'fp-main-content';
  }

  /**
   * Announce a message to screen readers
   * @param {string} message
   */
  function announce(message) {
    // Clear then set — forces re-announcement even for same text
    liveRegion.textContent = '';
    requestAnimationFrame(() => {
      liveRegion.textContent = message;
    });
  }

  /**
   * Update ARIA state when active section changes
   * @param {number} newIndex
   * @param {number} prevIndex
   */
  function setActiveSection(newIndex, _prevIndex) {
    const total = sections.length;

    sections.forEach((section, i) => {
      const isActive = i === newIndex;
      section.setAttribute('aria-hidden', String(!isActive));
      if (isActive) section.removeAttribute('tabindex');
      else section.setAttribute('tabindex', '-1');
    });

    const activeSection = sections[newIndex];
    const label = activeSection?.getAttribute('aria-label') || `Section ${newIndex + 1}`;
    announce(`${label}. Section ${newIndex + 1} of ${total}.`);
  }

  /**
   * Check for reduced motion preference and apply CSS class
   * @returns {boolean}
   */
  function checkMotion() {
    const reduced = prefersReducedMotion();
    document.documentElement.classList.toggle(CLASSES.REDUCED_MOTION, reduced);
    return reduced;
  }

  // Listen for OS-level motion preference changes
  const motionQuery = window.matchMedia?.('(prefers-reduced-motion: reduce)');
  const onMotionChange = e => {
    document.documentElement.classList.toggle(CLASSES.REDUCED_MOTION, e.matches);
  };
  motionQuery?.addEventListener('change', onMotionChange);

  // Initialize
  checkMotion();

  return {
    announce,
    setActiveSection,
    checkMotion,
    destroy() {
      liveRegion.remove();
      skipLink.remove();
      motionQuery?.removeEventListener('change', onMotionChange);
    },
  };
}

/**
 * Manage focus when navigating to a new section
 * @param {HTMLElement} section
 */
export function manageFocusOnSection(section) {
  if (!section) return;
  // Move focus to the section for screen reader users
  // Use preventScroll to avoid double-scroll
  const focusTarget =
    section.querySelector('[autofocus]') || section.querySelector('h1,h2,h3') || section;

  requestAnimationFrame(() => {
    focusTarget.focus({ preventScroll: true });
  });
}
