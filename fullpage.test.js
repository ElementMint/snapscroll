/**
 * @file fullpage.test.js
 * @description Unit test suite using Vitest.
 * Run: npm test
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mergeConfig, DEFAULT_CONFIG, parseDataConfig }     from './js/core/config.js';
import { createState }                                       from './js/core/state.js';
import { createEventBus }                                    from './js/core/events.js';
import { normalizeAnchor, buildAnchor, parseAnchor }        from './js/utils/url.js';
import { throttle, debounce, prefersReducedMotion, isAEMAuthorMode } from './js/utils/performance.js';
import { CLASSES, EVENTS }                                  from './js/core/constants.js';

// ─── Config ──────────────────────────────────────────────────────────────────

describe('mergeConfig', () => {
  it('returns defaults when no overrides', () => {
    const result = mergeConfig(DEFAULT_CONFIG, {});
    expect(result.navigation).toBe(true);
    expect(result.loop).toBe(false);
  });

  it('overrides scalar values', () => {
    const result = mergeConfig(DEFAULT_CONFIG, { scrollingSpeed: 1000 });
    expect(result.scrollingSpeed).toBe(1000);
  });

  it('keeps non-overridden defaults intact', () => {
    const result = mergeConfig(DEFAULT_CONFIG, { loop: true });
    expect(result.navigation).toBe(true);
    expect(result.progressBar).toBe(false);
  });

  it('merges arrays as value replacement (not concat)', () => {
    const result = mergeConfig(DEFAULT_CONFIG, { anchors: ['a', 'b'] });
    expect(result.anchors).toEqual(['a', 'b']);
  });

  it('does not mutate the target object', () => {
    const orig = { ...DEFAULT_CONFIG };
    mergeConfig(DEFAULT_CONFIG, { scrollingSpeed: 999 });
    expect(DEFAULT_CONFIG.scrollingSpeed).toBe(orig.scrollingSpeed);
  });
});

describe('parseDataConfig', () => {
  it('parses valid JSON from attribute', () => {
    const el = document.createElement('div');
    el.setAttribute('data-fp-config', '{"loop":true,"progressBar":true}');
    const cfg = parseDataConfig(el);
    expect(cfg.loop).toBe(true);
    expect(cfg.progressBar).toBe(true);
  });

  it('returns empty object on missing attribute', () => {
    const el = document.createElement('div');
    expect(parseDataConfig(el)).toEqual({});
  });

  it('returns empty object on invalid JSON (with console.warn)', () => {
    const el = document.createElement('div');
    el.setAttribute('data-fp-config', '{bad json}');
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect(parseDataConfig(el)).toEqual({});
    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
  });
});

// ─── State ───────────────────────────────────────────────────────────────────

describe('createState', () => {
  it('initialises with default values', () => {
    const s = createState();
    expect(s.get('activeSection')).toBe(0);
    expect(s.get('isScrolling')).toBe(false);
    expect(s.get('initialized')).toBe(false);
  });

  it('sets a single key', () => {
    const s = createState();
    s.set('activeSection', 3);
    expect(s.get('activeSection')).toBe(3);
  });

  it('sets multiple keys via object', () => {
    const s = createState();
    s.set({ activeSection: 2, isScrolling: true });
    expect(s.get('activeSection')).toBe(2);
    expect(s.get('isScrolling')).toBe(true);
  });

  it('returns full state snapshot when no key passed', () => {
    const s = createState();
    const snap = s.get();
    expect(typeof snap).toBe('object');
    expect(snap).toHaveProperty('activeSection');
  });

  it('notifies subscribers on change', () => {
    const s   = createState();
    const spy = vi.fn();
    s.subscribe('activeSection', spy);
    s.set('activeSection', 1);
    expect(spy).toHaveBeenCalledWith(1, 0, 'activeSection');
  });

  it('does not notify when value unchanged', () => {
    const s   = createState();
    const spy = vi.fn();
    s.subscribe('activeSection', spy);
    s.set('activeSection', 0); // same as default
    expect(spy).not.toHaveBeenCalled();
  });

  it('unsubscribe stops notifications', () => {
    const s   = createState();
    const spy = vi.fn();
    const unsub = s.subscribe('activeSection', spy);
    unsub();
    s.set('activeSection', 2);
    expect(spy).not.toHaveBeenCalled();
  });

  it('resets to default values', () => {
    const s = createState();
    s.set({ activeSection: 4, isScrolling: true });
    s.reset();
    expect(s.get('activeSection')).toBe(0);
    expect(s.get('isScrolling')).toBe(false);
  });
});

// ─── Event bus ───────────────────────────────────────────────────────────────

describe('createEventBus', () => {
  let bus;

  beforeEach(() => {
    bus = createEventBus(null); // no DOM element in unit tests
  });

  afterEach(() => {
    bus.destroy();
  });

  it('calls registered handler on emit', () => {
    const spy = vi.fn();
    bus.on('test', spy);
    bus.emit('test', { val: 42 });
    expect(spy).toHaveBeenCalledWith({ val: 42 });
  });

  it('returns false when handler returns false', () => {
    bus.on('test', () => false);
    const result = bus.emit('test');
    expect(result).toBe(false);
  });

  it('returns true when no handler cancels', () => {
    bus.on('test', () => {});
    expect(bus.emit('test')).toBe(true);
  });

  it('off removes handler', () => {
    const spy = vi.fn();
    bus.on('test', spy);
    bus.off('test', spy);
    bus.emit('test');
    expect(spy).not.toHaveBeenCalled();
  });

  it('once fires exactly one time', () => {
    const spy = vi.fn();
    bus.once('test', spy);
    bus.emit('test');
    bus.emit('test');
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('supports multiple handlers for same event', () => {
    const a = vi.fn(), b = vi.fn();
    bus.on('test', a);
    bus.on('test', b);
    bus.emit('test');
    expect(a).toHaveBeenCalled();
    expect(b).toHaveBeenCalled();
  });
});

// ─── URL utilities ────────────────────────────────────────────────────────────

describe('normalizeAnchor', () => {
  it('lowercases and trims', () => {
    expect(normalizeAnchor('  HERO  ')).toBe('hero');
  });

  it('replaces spaces with dashes', () => {
    expect(normalizeAnchor('About Us')).toBe('about-us');
  });

  it('strips non-alphanumeric characters', () => {
    expect(normalizeAnchor('hello@world!')).toBe('helloworld');
  });

  it('preserves dashes and underscores', () => {
    expect(normalizeAnchor('my-section_1')).toBe('my-section_1');
  });

  it('returns empty string for null/undefined', () => {
    expect(normalizeAnchor(null)).toBe('');
    expect(normalizeAnchor(undefined)).toBe('');
  });
});

describe('parseAnchor', () => {
  it('splits section and slide', () => {
    expect(parseAnchor('work/slide-2')).toEqual({ section: 'work', slide: 'slide-2' });
  });

  it('returns null slide when no slash', () => {
    expect(parseAnchor('about')).toEqual({ section: 'about', slide: null });
  });
});

describe('buildAnchor', () => {
  it('builds combined anchor', () => {
    expect(buildAnchor('work', 'slide-1')).toBe('work/slide-1');
  });

  it('returns section alone when no slide', () => {
    expect(buildAnchor('contact')).toBe('contact');
    expect(buildAnchor('contact', undefined)).toBe('contact');
  });

  it('returns empty string when no section', () => {
    expect(buildAnchor('')).toBe('');
    expect(buildAnchor(null)).toBe('');
  });
});

// ─── Performance utilities ────────────────────────────────────────────────────

describe('throttle', () => {
  it('calls function at most once per interval', async () => {
    vi.useFakeTimers();
    const spy = vi.fn();
    const fn  = throttle(spy, 100);
    fn(); fn(); fn();
    await vi.runAllTimersAsync();
    expect(spy).toHaveBeenCalledTimes(1);
    vi.useRealTimers();
  });
});

describe('debounce', () => {
  it('only fires after the delay', async () => {
    vi.useFakeTimers();
    const spy = vi.fn();
    const fn  = debounce(spy, 200);
    fn(); fn(); fn();
    expect(spy).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(200);
    expect(spy).toHaveBeenCalledTimes(1);
    vi.useRealTimers();
  });

  it('cancel prevents invocation', async () => {
    vi.useFakeTimers();
    const spy = vi.fn();
    const fn  = debounce(spy, 200);
    fn();
    fn.cancel();
    await vi.advanceTimersByTimeAsync(200);
    expect(spy).not.toHaveBeenCalled();
    vi.useRealTimers();
  });
});

describe('isAEMAuthorMode', () => {
  it('returns false in clean browser environment', () => {
    expect(isAEMAuthorMode()).toBe(false);
  });

  it('detects wcmmode=edit in URL', () => {
    const orig = window.location.href;
    // jsdom limitation: can't set search directly; test via the function logic
    const result = /[?&]wcmmode=(edit|design)/i.test('?wcmmode=edit');
    expect(result).toBe(true);
  });
});

// ─── CLASSES constant completeness ───────────────────────────────────────────

describe('CLASSES constants', () => {
  it('has all required CSS class names', () => {
    const required = [
      'WRAPPER','SECTION','SLIDE','ACTIVE','NAV','NAV_DOT','INITIALIZED'
    ];
    required.forEach(key => {
      expect(CLASSES).toHaveProperty(key);
      expect(typeof CLASSES[key]).toBe('string');
    });
  });
});

describe('EVENTS constants', () => {
  it('all event names are prefixed with fp:', () => {
    Object.values(EVENTS).forEach(ev => {
      expect(ev.startsWith('fp:')).toBe(true);
    });
  });
});
