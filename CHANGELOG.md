## [1.0.5](https://github.com/ElementMint/snapscroll/compare/v1.0.4...v1.0.5) (2026-06-03)


### Bug Fixes

* remove unused imports and drop redundant default export ([45aa385](https://github.com/ElementMint/snapscroll/commit/45aa385a6c0bdff50378efb564bfd2410816e613))

## [1.0.4](https://github.com/ElementMint/snapscroll/compare/v1.0.3...v1.0.4) (2026-06-02)


### Bug Fixes

* restore CLASSES import in accessibility.js ([3583dd9](https://github.com/ElementMint/snapscroll/commit/3583dd9657fbd35d7c3aa8e4b921148d29e2bd7a))

## [1.0.3](https://github.com/ElementMint/snapscroll/compare/v1.0.2...v1.0.3) (2026-06-02)


### Bug Fixes

* drop Node 18 from CI matrix, bump engines to >=20 ([46f98a5](https://github.com/ElementMint/snapscroll/commit/46f98a51bc78801e5cf74b19715803fddecd0a0a))

## [1.0.2](https://github.com/ElementMint/snapscroll/compare/v1.0.1...v1.0.2) (2026-06-02)


### Bug Fixes

* restore addClass import in navigation.js and scope coverage to core/ ([df0531d](https://github.com/ElementMint/snapscroll/commit/df0531d6bcc3265d2f67d0cffe2f8b65f0f15da2))

## [1.0.1](https://github.com/ElementMint/snapscroll/compare/v1.0.0...v1.0.1) (2026-06-02)


### Bug Fixes

* add braces to multi-line if in keyboard.js and align eslint curly rule ([bd2da77](https://github.com/ElementMint/snapscroll/commit/bd2da77244fcc2de98e9610a8a03f5fbb54c37be))

# 1.0.0 (2026-06-02)


### Bug Fixes

* remove unused imports and disable husky on CI ([c6da305](https://github.com/ElementMint/snapscroll/commit/c6da3056393633eec02ec14e732324f41477474b))
* resolve test import paths and add jsdom dependency ([cc37a46](https://github.com/ElementMint/snapscroll/commit/cc37a469f86e2fd0b59b8bf7679fab66db611399))


### Features

* initial release of snapscroll v1.0.0 ([e7712de](https://github.com/ElementMint/snapscroll/commit/e7712de8a96f62112f5e7716aa4063fd6df80fd5))

# Changelog

All notable changes to FullPage Engine are documented here.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

---

## [1.0.0] — 2025-05-15

### Added

**Core engine**
- `FullPageEngine` class with full lifecycle management
- CSS Scroll Snap as the primary scroll mechanism (replaces all JS position hacks)
- `scrollIntoView` for programmatic navigation (smooth + instant)
- Infinite vertical loop via `loop: true`
- Responsive mode via `responsiveWidth` / `responsiveHeight`

**Modules**
- Touch swipe module — angle threshold filtering, passive listeners
- Keyboard module — Arrow, PageUp/Down, Home, End, Space
- Wheel module — delta thresholding + cooldown to prevent over-scroll
- Horizontal slides with CSS scroll snap (X axis)
- Overflow sections — inner scroll before yielding to engine
- Lazy loading via `IntersectionObserver` + `data-fp-lazy-src`

**Navigation**
- Side dot navigation with tooltips
- Top progress bar
- URL hash management via `pushState` / `replaceState` (no scroll jump)
- Deep link resolution on page load

**Accessibility**
- Skip link injection
- `aria-label` from heading text
- `aria-hidden` on inactive sections
- Live region announcements for screen readers
- `prefers-reduced-motion` detection + CSS class toggle
- Focus management to new section on navigation

**Observers**
- `IntersectionObserver` for active-section detection
- `ResizeObserver` for responsive breakpoints
- `MutationObserver` for AEM/SPA dynamic DOM changes

**Plugin system**
- Plugin interface with 6 lifecycle hooks
- `createGSAPPlugin(gsap)` — data-attribute driven timeline
- `createLenisPlugin(lenis)` — pause/resume compat

**Events**
- DOM `CustomEvent` dispatch on the wrapper element
- Cancellable `fp:beforeLeave` via `e.preventDefault()`
- Internal pub/sub via `fp.on()` with unsubscribe return

**AEM**
- Five-strategy author mode detection
- `fp-author-mode` CSS class that resets all snap behavior
- `fp.reinit()` for SPA editor refreshes
- MutationObserver auto-reinit on structural DOM change

**Performance**
- `content-visibility: auto` on all sections
- `will-change: contents` only on the active section
- `contain: layout paint` on all sections
- `100svh` (small viewport height) for mobile browser chrome correctness

**Developer experience**
- Full TypeScript declarations (`fullpage.d.ts`)
- Vite build config (ESM / CJS / IIFE bundles)
- Vitest test suite with jsdom environment
- 5 usage examples

---

## [Unreleased]

### Planned
- `data-fp-speed` per-section transition speed override
- `fp.pause()` / `fp.resume()` API
- Prefers-contrast media query support
- Vertical slides (X + Y snap combined)
- Scroll progress per section (for parallax hooks)
- First-class Astro / Next.js integration guide
