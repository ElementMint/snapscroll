/**
 * @file vite.config.js
 * @description Vite config producing three bundle formats:
 *  - ESM       (tree-shakable, for bundlers)
 *  - CJS       (legacy Node require)
 *  - IIFE      (direct <script> tag, global window.FullPageEngine)
 *
 * Also compiles fullpage.scss → dist/fullpage-engine.css
 */

import { defineConfig } from 'vite';
import { resolve }      from 'path';

export default defineConfig({
  // ── Dev server ─────────────────────────────────────────────────────────────
  server: {
    open: '/demo.html',
    port: 3000,
  },

  // ── Root (demo.html lives here) ────────────────────────────────────────────
  root: '.',

  // ── Library build ──────────────────────────────────────────────────────────
  build: {
    outDir:   'dist',
    emptyOutDir: true,

    lib: {
      entry:    resolve(__dirname, 'js/init.js'),
      name:     'FullPageEngine',
      fileName: 'fullpage-engine',
      formats:  ['es', 'cjs', 'iife'],
    },

    rollupOptions: {
      // No external deps — everything is vanilla
      external: [],

      output: {
        // ESM: keep tree-shakability
        esModule: true,

        // IIFE: expose as window.FullPageEngine
        globals: {},

        // Asset file names
        assetFileNames: (assetInfo) => {
          if (assetInfo.name?.endsWith('.css')) {
            return 'fullpage-engine.css';
          }
          return assetInfo.name ?? 'asset';
        },
      },
    },

    // Target modern browsers (no IE, no old Edge)
    target: ['es2020', 'chrome80', 'firefox75', 'safari14'],

    // Enable minification for production
    minify: 'esbuild',

    // Source maps for debugging
    sourcemap: true,

    // Chunk splitting off for lib builds
    cssCodeSplit: false,
  },

  // ── CSS / SCSS preprocessing ───────────────────────────────────────────────
  css: {
    preprocessorOptions: {
      scss: {
        // Silence deprecation warnings from sass
        quietDeps: true,
        // Include paths for @use / @forward
        loadPaths: [resolve(__dirname, 'scss')],
      },
    },
    // Post-process with autoprefixer
    postcss: {
      plugins: [],
    },
  },

  // ── Resolve ────────────────────────────────────────────────────────────────
  resolve: {
    alias: {
      '@fp/core':          resolve(__dirname, 'js/core'),
      '@fp/modules':       resolve(__dirname, 'js/modules'),
      '@fp/utils':         resolve(__dirname, 'js/utils'),
      '@fp/observers':     resolve(__dirname, 'js/observers'),
      '@fp/accessibility': resolve(__dirname, 'js/accessibility'),
    },
  },
});
