/**
 * @file url.js
 * @description URL hash management for anchor-based navigation.
 * Uses replaceState/pushState for no-scroll hash updates.
 */

/**
 * Set URL hash without triggering a scroll
 * @param {string} anchor
 * @param {boolean} [push=false] - pushState vs replaceState
 */
export function setHash(anchor, push = false) {
  if (!anchor) {
    clearHash(push);
    return;
  }
  const hash = anchor.startsWith('#') ? anchor : `#${anchor}`;
  try {
    if (push) {
      history.pushState(null, '', hash);
    } else {
      history.replaceState(null, '', hash);
    }
  } catch (e) {
    // Fallback for cross-origin frames (AEM iframes etc.)
    window.location.hash = hash;
  }
}

/**
 * Clear URL hash without page scroll
 * @param {boolean} [push=false]
 */
export function clearHash(push = false) {
  const url = window.location.pathname + window.location.search;
  try {
    if (push) {
      history.pushState(null, '', url);
    } else {
      history.replaceState(null, '', url);
    }
  } catch (e) { /* noop in sandboxed iframes */ }
}

/**
 * Get the current URL hash (without #)
 * @returns {string}
 */
export function getHash() {
  return window.location.hash.replace(/^#/, '');
}

/**
 * Normalize anchor string (lowercase, spaces → dashes)
 * @param {string} str
 * @returns {string}
 */
export function normalizeAnchor(str) {
  return (str || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-_]/g, '');
}

/**
 * Build section/slide anchor key
 * @param {string} sectionAnchor
 * @param {string} [slideAnchor]
 * @returns {string}
 */
export function buildAnchor(sectionAnchor, slideAnchor) {
  if (!sectionAnchor) return '';
  return slideAnchor ? `${sectionAnchor}/${slideAnchor}` : sectionAnchor;
}

/**
 * Parse an anchor string into section + optional slide
 * @param {string} hash
 * @returns {{ section: string, slide: string|null }}
 */
export function parseAnchor(hash) {
  const [section = '', slide = null] = hash.split('/');
  return { section, slide };
}
