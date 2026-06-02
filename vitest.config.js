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
      include:  ['js/**/*.js'],
      exclude:  ['js/init.js'],
      thresholds: {
        branches:  80,
        functions: 85,
        lines:     85,
        statements:85,
      },
    },
  },
});
