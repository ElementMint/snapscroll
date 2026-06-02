/**
 * @file vitest.config.js
 */

import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals:     true,
    setupFiles:  [],
    include:     ['**/*.test.js'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'html'],
      // Only measure coverage on pure-logic modules testable in jsdom.
      // DOM-heavy modules (FullPageEngine, modules/*, observers/*, accessibility/*)
      // require a real browser and are covered by Playwright e2e tests.
      include: [
        'js/core/*.js',
      ],
      exclude: ['js/init.js'],
      thresholds: {
        branches:   80,
        functions:  90,
        lines:      90,
        statements: 90,
      },
    },
  },
});
