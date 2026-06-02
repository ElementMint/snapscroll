/**
 * @file slides.js
 * @description Horizontal slides module.
 * Uses CSS scroll-snap on a per-section horizontal scroll container.
 * Each section with [data-fp-slide] children gets a slide container.
 */

import { CLASSES, ATTRS, EVENTS }                from '../core/constants.js';
import { addClass, removeClass, $$, createElement } from '../utils/dom.js';
import { PASSIVE_OPTS }                           from '../utils/performance.js';

/**
 * Initialize horizontal slides for a section
 * @param {HTMLElement} section
 * @param {Object} options
 * @param {boolean} [options.loop=false]
 * @param {boolean} [options.autoplay=false]
 * @param {number}  [options.autoplayInterval=5000]
 * @param {Function} [options.onSlideChange]
 * @param {Object}   [options.eventBus]
 * @returns {{ activeIndex: number, goTo(i): void, next(): void, prev(): void, destroy(): void }}
 */
export function initSectionSlides(section, options = {}) {
  const {
    loop             = false,
    autoplay         = false,
    autoplayInterval = 5000,
    onSlideChange,
    eventBus,
  } = options;

  const slides = $$(`.${CLASSES.SLIDE}`, section);
  if (!slides.length) return null;

  let activeIndex  = 0;
  let autoplayTimer = null;

  // Create slide wrapper if not already structured
  let slideContainer = section.querySelector(`.${CLASSES.SLIDE_CONTAINER}`);
  if (!slideContainer) {
    slideContainer = createElement('div', { class: CLASSES.SLIDE_CONTAINER });
    // Move slides into container
    slides.forEach(slide => slideContainer.appendChild(slide));
    section.appendChild(slideContainer);
  }

  // Slide controls (arrows)
  const prevBtn = createElement('button', {
    class:        'fp-slide-arrow fp-slide-arrow--prev',
    'aria-label': 'Previous slide',
    tabindex:     '0',
  }, '‹');

  const nextBtn = createElement('button', {
    class:        'fp-slide-arrow fp-slide-arrow--next',
    'aria-label': 'Next slide',
    tabindex:     '0',
  }, '›');

  section.appendChild(prevBtn);
  section.appendChild(nextBtn);

  // Slide dots
  const dotsContainer = createElement('div', { class: 'fp-slides-nav', 'aria-label': 'Slide navigation' });
  const dotBtns = slides.map((_, i) => {
    const dot = createElement('button', {
      class:        'fp-slides-nav__dot',
      'aria-label': `Slide ${i + 1}`,
      'aria-current': i === 0 ? 'true' : 'false',
      'data-slide-index': String(i),
    });
    dotsContainer.appendChild(dot);
    return dot;
  });
  section.appendChild(dotsContainer);

  function setActiveSlide(index, source = 'api') {
    const prev = activeIndex;
    let   next = index;

    if (loop) {
      next = ((next % slides.length) + slides.length) % slides.length;
    } else {
      next = Math.max(0, Math.min(slides.length - 1, next));
    }

    if (next === prev && source !== 'init') return;

    activeIndex = next;

    slides.forEach((slide, i) => {
      const isActive = i === next;
      slide.classList.toggle(CLASSES.ACTIVE, isActive);
      slide.setAttribute('aria-hidden', String(!isActive));
      if (isActive) slide.removeAttribute('tabindex');
      else          slide.setAttribute('tabindex', '-1');
    });

    dotBtns.forEach((dot, i) => {
      const isActive = i === next;
      dot.classList.toggle('fp-slides-nav__dot--active', isActive);
      dot.setAttribute('aria-current', String(isActive));
    });

    // Scroll snap: use scrollLeft on the container
    const slideWidth = slideContainer.offsetWidth;
    slideContainer.scrollTo({
      left:     slideWidth * next,
      behavior: 'smooth',
    });

    onSlideChange?.({ prev, next, section });
    eventBus?.emit(EVENTS.SLIDE_LOAD, { slideIndex: next, prevIndex: prev, section });
  }

  // Arrow click handlers
  function onPrevClick() { setActiveSlide(activeIndex - 1); }
  function onNextClick() { setActiveSlide(activeIndex + 1); }
  function onDotClick(e) {
    const dot = e.target.closest('.fp-slides-nav__dot');
    if (!dot) return;
    const i = parseInt(dot.getAttribute('data-slide-index'), 10);
    if (!isNaN(i)) setActiveSlide(i);
  }

  prevBtn.addEventListener('click', onPrevClick);
  nextBtn.addEventListener('click', onNextClick);
  dotsContainer.addEventListener('click', onDotClick);

  // Handle native scroll snap changes
  let scrollTimer = null;
  function onSlideScroll() {
    if (scrollTimer) clearTimeout(scrollTimer);
    scrollTimer = setTimeout(() => {
      const slideWidth = slideContainer.offsetWidth;
      const snappedIndex = Math.round(slideContainer.scrollLeft / slideWidth);
      if (snappedIndex !== activeIndex) setActiveSlide(snappedIndex, 'scroll');
    }, 100);
  }
  slideContainer.addEventListener('scroll', onSlideScroll, PASSIVE_OPTS);

  // Autoplay
  function startAutoplay() {
    if (!autoplay || slides.length < 2) return;
    autoplayTimer = setInterval(() => {
      const next = loop
        ? (activeIndex + 1) % slides.length
        : activeIndex < slides.length - 1 ? activeIndex + 1 : 0;
      setActiveSlide(next, 'autoplay');
    }, autoplayInterval);
  }

  function stopAutoplay() {
    if (autoplayTimer) {
      clearInterval(autoplayTimer);
      autoplayTimer = null;
    }
  }

  // Init
  setActiveSlide(0, 'init');
  startAutoplay();

  // Pause autoplay on user interaction
  slideContainer.addEventListener('pointerenter', stopAutoplay,  PASSIVE_OPTS);
  slideContainer.addEventListener('pointerleave', startAutoplay, PASSIVE_OPTS);

  return {
    get activeIndex() { return activeIndex; },
    goTo(i)  { setActiveSlide(i); },
    next()   { setActiveSlide(activeIndex + 1); },
    prev()   { setActiveSlide(activeIndex - 1); },
    destroy() {
      stopAutoplay();
      prevBtn.removeEventListener('click', onPrevClick);
      nextBtn.removeEventListener('click', onNextClick);
      dotsContainer.removeEventListener('click', onDotClick);
      slideContainer.removeEventListener('scroll', onSlideScroll, PASSIVE_OPTS);
      slideContainer.removeEventListener('pointerenter', stopAutoplay,  PASSIVE_OPTS);
      slideContainer.removeEventListener('pointerleave', startAutoplay, PASSIVE_OPTS);
      prevBtn.remove();
      nextBtn.remove();
      dotsContainer.remove();
      if (scrollTimer) clearTimeout(scrollTimer);
    }
  };
}
