/**
 * @file observers.js
 * @description IntersectionObserver and ResizeObserver wrappers.
 * Handles active section detection and responsive layout changes.
 */

import { debounce } from '../utils/performance.js';

/**
 * Create an IntersectionObserver for active section detection
 * @param {HTMLElement[]} sections
 * @param {Function} onActiveChange - Callback(activeIndex, entry)
 * @returns {{ destroy(): void }}
 */
export function createSectionObserver(sections, onActiveChange) {
  if (!('IntersectionObserver' in window)) {
    return { destroy: () => {} };
  }

  // Use the scroll container as root so ratios are measured against it,
  // not the viewport. A 0.6 threshold avoids the mid-scroll ambiguity
  // where both origin and destination are ~50% visible simultaneously.
  const root = sections[0]?.closest('.fp-wrapper') || null;

  const observer = new IntersectionObserver(
    entries => {
      let maxRatio = 0;
      let maxEntry = null;

      for (const entry of entries) {
        if (entry.intersectionRatio > maxRatio) {
          maxRatio = entry.intersectionRatio;
          maxEntry = entry;
        }
      }

      if (maxEntry && maxRatio >= 0.6) {
        const index = sections.indexOf(maxEntry.target);
        if (index !== -1) {
          onActiveChange(index, maxEntry);
        }
      }
    },
    {
      root,
      threshold: [0, 0.5, 0.6, 0.75, 1.0],
      rootMargin: '0px',
    }
  );

  sections.forEach(s => observer.observe(s));

  return {
    destroy() {
      observer.disconnect();
    },
  };
}

/**
 * Create a ResizeObserver to handle viewport/container size changes
 * @param {HTMLElement} container
 * @param {Function} onResize - Callback({ width, height })
 * @param {number}   [debounceMs=200]
 * @returns {{ destroy(): void }}
 */
export function createResizeObserver(container, onResize, debounceMs = 200) {
  if (!('ResizeObserver' in window)) {
    // Fallback to window resize event
    const handler = debounce(() => {
      onResize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    }, debounceMs);

    window.addEventListener('resize', handler);
    return {
      destroy() {
        window.removeEventListener('resize', handler);
        handler.cancel();
      },
    };
  }

  const debouncedResize = debounce(entries => {
    for (const entry of entries) {
      const { width, height } = entry.contentRect;
      onResize({ width, height, entry });
    }
  }, debounceMs);

  const observer = new ResizeObserver(debouncedResize);
  observer.observe(container);

  return {
    destroy() {
      observer.disconnect();
      debouncedResize.cancel();
    },
  };
}

/**
 * Create an observer for content-visibility sections (AEM dynamic components)
 * Uses MutationObserver to detect DOM changes inside the wrapper
 * @param {HTMLElement} container
 * @param {Function} onMutation - Callback(mutationList)
 * @returns {{ destroy(): void }}
 */
export function createMutationObserver(container, onMutation) {
  const observer = new MutationObserver(
    debounce(mutations => {
      // Filter for meaningful changes (ignore attribute updates)
      const structural = mutations.filter(
        m => m.type === 'childList' && (m.addedNodes.length > 0 || m.removedNodes.length > 0)
      );
      if (structural.length > 0) onMutation(structural);
    }, 300)
  );

  observer.observe(container, {
    childList: true,
    subtree: true,
    // Don't observe attribute changes — too noisy
  });

  return {
    destroy() {
      observer.disconnect();
    },
  };
}
