# FullPage Engine

> A production-grade, accessibility-first, fullpage scrolling library built on CSS Scroll Snap and native browser APIs. Zero dependencies. No scroll hijacking.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](./LICENSE)

---

## Why Another Fullpage Library?

Old approaches (fullPage.js, etc.) use JavaScript to manipulate scroll position via `translateY` or `scrollTop`. This breaks natural browser behavior, hurts accessibility, kills Lighthouse scores, and is incompatible with CSS Scroll Snap.

**FullPage Engine is different:**

| Feature | Old Approach | FullPage Engine |
|---|---|---|
| Scroll mechanism | JS position manipulation | CSS Scroll Snap (native) |
| Animation | `translateY` entire page | `scrollIntoView` + CSS |
| Passive listeners | ❌ Often blocking | ✅ Always passive |
| `prefers-reduced-motion` | ❌ Rare | ✅ First class |
| Content visibility | ❌ Hidden from crawlers | ✅ Always in DOM |
| AEM author mode | ❌ Breaks authoring | ✅ Auto-detects, skips init |
| CLS impact | ❌ High | ✅ Minimal (reserved dimensions) |
| Dependencies | jQuery, extras | Zero |

---

## Installation

```bash
# npm (when bundled)
npm install fullpage-engine

# Or copy the /js and /scss folders directly
```

---

## Quick Start

### HTML structure
```html
<div id="fullpage">
  <section class="fp-section" data-fp-anchor="home">
    <h1>Section 1</h1>
  </section>
  <section class="fp-section" data-fp-anchor="about">
    <h2>Section 2</h2>
  </section>
</div>
```

### JavaScript
```javascript
import { FullPageEngine } from './js/init.js';

const fp = new FullPageEngine('#fullpage', {
  navigation: true,
  loop: false,
  progressBar: true,
});
```

### Auto-init (no JS required)
```html
<div id="fullpage" data-fp-auto data-fp-config='{"navigation":true}'>
  ...
</div>
```

---

## Configuration

| Option | Type | Default | Description |
|---|---|---|---|
| `navigation` | `boolean` | `true` | Show dot navigation |
| `navigationPosition` | `'left'`\|`'right'` | `'right'` | Dot nav position |
| `navigationTooltips` | `string[]` | `[]` | Labels for each section |
| `loop` | `boolean` | `false` | Infinite vertical loop |
| `loopSlides` | `boolean` | `false` | Infinite horizontal slides |
| `scrollingSpeed` | `number` | `700` | Transition cooldown (ms) |
| `keyboardScrolling` | `boolean` | `true` | Arrow key navigation |
| `lazyLoading` | `boolean` | `true` | Lazy load media |
| `progressBar` | `boolean` | `false` | Top progress bar |
| `recordHistory` | `boolean` | `true` | Update browser URL |
| `animateAnchor` | `boolean` | `true` | Animate on anchor nav |
| `responsiveWidth` | `number` | `0` | Disable snap below px |
| `responsiveHeight` | `number` | `0` | Disable snap below px |
| `autoplay` | `boolean` | `false` | Autoplay slides |
| `autoplayInterval` | `number` | `5000` | Autoplay interval (ms) |
| `gsap` | `Object\|null` | `null` | GSAP instance for plugin |
| `plugins` | `FPPlugin[]` | `[]` | Plugin array |

---

## Callbacks

```javascript
new FullPageEngine('#fp', {
  onInit(instance) { },

  // Return false to cancel navigation
  beforeLeave(originEl, destEl, direction) {
    return true;
  },

  onLeave(originEl, destEl, destIndex) { },
  afterLoad(sectionEl, index) { },
  onSlideLeave(sectionEl, originSlide, destSlide) { },
  afterSlideLoad(sectionEl, slideIndex) { },
  onResize({ width, height, isResponsive }) { },
});
```

---

## Public API

```javascript
const fp = new FullPageEngine('#fp');

fp.moveDown();              // Next section
fp.moveUp();                // Prev section
fp.moveTo(2);               // Go to index 2
fp.moveTo('about');         // Go to anchor
fp.moveToSlide(1);          // Go to slide in active section

fp.getActiveSection();      // → number
fp.getActiveSlide();        // → number

fp.on('fp:afterLoad', fn);  // DOM event listener
fp.use(myPlugin);           // Register plugin
fp.reinit();                // Re-initialize (AEM/SPA refresh)
fp.destroy();               // Full cleanup
```

---

## Custom Events (DOM)

Listen on the wrapper element:

```javascript
document.getElementById('fp').addEventListener('fp:afterLoad', (e) => {
  console.log(e.detail); // { section, index, anchor }
});
```

| Event | Detail |
|---|---|
| `fp:init` | `{ instance }` |
| `fp:beforeLeave` | `{ origin, destination, originIndex, destIndex }` |
| `fp:onLeave` | `{ origin, dest, destIdx }` |
| `fp:afterLoad` | `{ section, index, anchor }` |
| `fp:slideLoad` | `{ slideIndex, prevIndex, section }` |
| `fp:resize` | `{ width, height, isResponsive }` |
| `fp:destroy` | `{ instance }` |

---

## Horizontal Slides

Add `.fp-slide` children to any section:

```html
<section class="fp-section" data-fp-anchor="work">
  <div class="fp-slides">
    <article class="fp-slide" data-fp-anchor="slide-1">Slide 1</article>
    <article class="fp-slide" data-fp-anchor="slide-2">Slide 2</article>
  </div>
</section>
```

Navigate with:
- Arrow keys (← →)
- Swipe gestures
- Auto-rendered arrow buttons and slide dots

---

## Overflow Sections

For sections with more content than 100vh:

```html
<section class="fp-section" data-fp-overflow data-fp-anchor="blog">
  <div><!-- Lots of content --></div>
</section>
```

The section becomes internally scrollable. After scrolling to the bottom, the engine proceeds to the next section.

---

## Lazy Loading

Mark media with `data-fp-lazy-src`:

```html
<img data-fp-lazy-src="/hero.webp" width="1200" height="800" alt="Hero">
```

The engine uses `IntersectionObserver` with a 300px root margin to pre-load media as sections approach the viewport. Prevents render-blocking and reduces initial bundle size impact on LCP.

---

## Entry Animations

Use `data-fp-animate` on any child element:

```html
<section class="fp-section">
  <h1 data-fp-animate>Title</h1>
  <p data-fp-animate style="--fp-delay: 150ms">Staggered</p>
</section>
```

Animations use only `opacity` + `transform` — no layout triggers, no repaints. Automatically disabled with `prefers-reduced-motion`.

---

## Plugin Architecture

```javascript
const myPlugin = {
  name: 'analytics',

  onInit({ instance }) {
    console.log('FP ready');
  },

  onLoad({ section, index }) {
    // Track section views
    analytics.track('section_view', { id: section.id });
  },

  onLeave({ section }) { },
  onDestroy() { },
};

fp.use(myPlugin);
```

### GSAP Plugin

```javascript
import { createGSAPPlugin } from './js/init.js';

const fp = new FullPageEngine('#fp', {
  plugins: [createGSAPPlugin(gsap)],
});
```

Mark elements with `data-gsap-from` and `data-gsap-to`:

```html
<h1 data-gsap-from='{"opacity":0,"y":40}' data-gsap-to='{"opacity":1,"y":0}'>
  Title
</h1>
```

### Lenis Plugin

```javascript
import { createLenisPlugin } from './js/init.js';

const lenis = new Lenis();
const fp = new FullPageEngine('#fp', {
  plugins: [createLenisPlugin(lenis)],
});
```

---

## AEM Integration

FullPage Engine auto-detects AEM author mode using multiple strategies:
- `Granite` namespace
- `CQ` namespace
- Body class flags (`aem-AuthorLayer-Edit`, `wcm-mode-edit`)
- URL parameter `?wcmmode=edit`
- Presence of `[data-cq-data-path]` elements

When detected, initialization is skipped and `.fp-author-mode` is applied, which resets all snap behavior via CSS so authoring works normally.

**Re-init after SPA/component refresh:**
```javascript
fp.reinit(); // or: fp.destroy(); fp = new FullPageEngine('#fp');
```

The `MutationObserver` inside the engine will auto-detect structural DOM changes and trigger a reinit.

---

## Accessibility Checklist

- ✅ Skip link injected before page
- ✅ ARIA `role="region"` on all sections
- ✅ `aria-label` from heading text or config
- ✅ `aria-hidden="true"` on non-active sections
- ✅ Live region announces section transitions
- ✅ Full keyboard navigation (Arrow, PgUp, PgDn, Home, End)
- ✅ Focus managed to new section on navigation
- ✅ `prefers-reduced-motion` disables all animations
- ✅ Navigation dots have proper `aria-label` and `aria-current`
- ✅ Slide arrows have `aria-label`
- ✅ Focus trapping respects overflow sections
- ✅ All interactive elements have `:focus-visible` styles

---

## Performance Architecture

### LCP
- Only the first section is rendered with `content-visibility: visible`
- All others use `content-visibility: auto` (browser paints on demand)
- Media is lazy-loaded via `data-fp-lazy-src` + IntersectionObserver
- No render-blocking JavaScript (all `type="module"` or deferred)

### CLS
- Sections reserve their full height via `min-height: 100svh`
- `contain-intrinsic-size: auto 100svh` preserves layout while content-visibility is `auto`
- No DOM mutations during scroll animations
- Image dimensions required via `width`/`height` attributes

### INP
- All event handlers use `{ passive: true }`
- No `preventDefault` on wheel/touch
- Keyboard handler is lightweight (one `keydown` listener, O(1) lookup)
- Scroll transitions use `scrollIntoView` — no JS animation loop

### TBT
- Modules are tree-shakable (ES module imports)
- Observers are deferred
- No synchronous blocking operations during init

### FPS
- CSS Scroll Snap handles all snapping — browser-native, GPU-accelerated
- Only `transform` and `opacity` are animated (no layout, no paint)
- `will-change: contents` applied only to active section
- `contain: layout paint` on all sections
- `content-visibility: auto` for off-screen paint elimination

---

## Mobile Optimization

- `100svh` (small viewport height) prevents iOS Chrome toolbar overlap
- `-webkit-overflow-scrolling: touch` for momentum scrolling
- Passive touch listeners — no scroll blocking
- Swipe angle threshold (30°) prevents accidental horizontal/vertical confusion
- Touch sensitivity configurable via `touchSensitivity` option
- Navigation dots have 44×44px minimum touch target (via `::before`)
- Responsive mode available for small viewports

---

## Browser Support

| Browser | Version |
|---|---|
| Chrome | 69+ |
| Firefox | 68+ |
| Safari | 14+ |
| Safari iOS | 15.4+ (100svh support) |
| Edge | 79+ |
| Samsung Internet | 10+ |

Fallback: On browsers without scroll-snap support, natural scrolling is used (graceful degradation).

---

## Folder Structure

```
fullpage/
├── js/
│   ├── core/
│   │   ├── constants.js     — CSS classes, events, keys, thresholds
│   │   ├── config.js        — Default config + merge helpers
│   │   └── state.js         — Reactive state store
│   │
│   ├── modules/
│   │   ├── touch.js         — Swipe gesture detection
│   │   ├── keyboard.js      — Arrow key navigation
│   │   ├── wheel.js         — Mouse wheel handling
│   │   ├── navigation.js    — Dot nav + progress bar
│   │   ├── slides.js        — Horizontal slides
│   │   ├── lazyload.js      — IntersectionObserver lazy loader
│   │   └── plugins.js       — Plugin system + GSAP/Lenis plugins
│   │
│   ├── utils/
│   │   ├── dom.js           — Zero-thrash DOM helpers
│   │   ├── performance.js   — Throttle, debounce, AEM detection
│   │   └── url.js           — Hash management
│   │
│   ├── observers/
│   │   └── observers.js     — IO, ResizeObserver, MutationObserver
│   │
│   ├── accessibility/
│   │   └── accessibility.js — A11y module: ARIA, focus, announcements
│   │
│   ├── FullPageEngine.js    — Main engine class (orchestrator)
│   └── init.js              — Public entry point + auto-init
│
├── scss/
│   ├── base/
│   │   ├── _variables.scss  — Design tokens
│   │   └── _reset.scss      — Base reset
│   ├── components/
│   │   ├── _layout.scss     — Wrapper + section styles
│   │   ├── _navigation.scss — Dot nav + progress
│   │   └── _slides.scss     — Horizontal slides
│   ├── utilities/
│   │   └── _utilities.scss  — Lazy, animations, a11y utilities
│   └── fullpage.scss        — Main SCSS entry
│
├── demo.html                — Full feature demo
└── README.md
```

---

## License

MIT © FullPage Engine Contributors
