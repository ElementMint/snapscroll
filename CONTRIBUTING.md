# Contributing to snapscroll

Thanks for your interest in contributing! This document explains how to get started.

## Development setup

```bash
git clone https://github.com/ElementMint/snapscroll.git
cd snapscroll
npm install        # installs deps + sets up husky hooks
npm run dev        # starts dev server at localhost:3000
```

## Project structure

```
js/
  core/        — config, state, event bus, constants
  modules/     — wheel, touch, keyboard, slides, navigation, lazyload, plugins
  observers/   — IntersectionObserver, ResizeObserver, MutationObserver wrappers
  utils/       — DOM helpers, performance utils, URL utils
  accessibility/ — ARIA, focus management, live regions
scss/          — source styles (SCSS)
dist/          — built output (do not edit)
examples/      — standalone HTML examples
```

## Commit messages

We use [Conventional Commits](https://www.conventionalcommits.org/) enforced by commitlint. Semantic-release reads these to determine the next version automatically.

| Prefix | Version bump | Example |
|--------|-------------|---------|
| `fix:` | patch | `fix: nav dot click blocked by tooltip span` |
| `feat:` | minor | `feat: add autoplay pause on visibility change` |
| `feat!:` or `BREAKING CHANGE:` | major | `feat!: rename scrollingSpeed to duration` |
| `docs:`, `chore:`, `test:`, `refactor:` | none | — |

## Making a change

1. Fork the repo and create a branch from `main`
2. Write your code — keep changes focused and minimal
3. Add or update tests in `fullpage.test.js`
4. Run `npm test` and `npm run lint` locally
5. Open a PR against `main` — fill in the template

## Running tests

```bash
npm test              # run once
npm run test:watch    # watch mode
npm run test:cover    # with coverage report
```

Coverage thresholds are enforced — PRs that drop below 80% will fail CI.

## Bundle size

We track bundle size with `size-limit`. Run `npm run size` before opening a PR — budget is **15 kB** (gzip) for the JS and **4 kB** for the CSS. Size regressions block merging.

## Releases

Releases are fully automated via semantic-release on every merge to `main`. You do not need to manually bump versions or update the changelog — that happens based on commit messages.
