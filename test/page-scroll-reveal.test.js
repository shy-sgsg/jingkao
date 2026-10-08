import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { observePageSections } from '../src/ui/scrollReveal.js';

function makeElement(top) {
  const classes = new Set();
  return {
    classes,
    getBoundingClientRect: () => ({ top }),
    classList: {
      add: (name) => classes.add(name),
      remove: (name) => classes.delete(name),
    },
  };
}

function fakeObserverClass() {
  class FakeIntersectionObserver {
    constructor(callback, options) {
      this.callback = callback;
      this.options = options;
      this.observed = [];
      this.unobserved = [];
      FakeIntersectionObserver.instances.push(this);
    }

    observe(target) { this.observed.push(target); }
    unobserve(target) { this.unobserved.push(target); }
    emit(entries) { this.callback(entries); }
  }
  FakeIntersectionObserver.instances = [];
  return FakeIntersectionObserver;
}

test('page sections reveal once as they enter the viewport', () => {
  const Observer = fakeObserverClass();
  const aboveFold = makeElement(220);
  const belowFold = makeElement(720);
  const root = { querySelectorAll: () => [aboveFold, belowFold] };

  const observer = observePageSections({
    root,
    viewportHeight: 640,
    prefersReducedMotion: false,
    IntersectionObserverImpl: Observer,
  });

  assert.deepEqual(observer.observed, [belowFold]);
  assert.match(observer.options.rootMargin, /-5\dpx/);
  assert.ok(belowFold.classes.has('scroll-reveal-pending'));
  assert.equal(aboveFold.classes.size, 0);

  observer.emit([{ target: belowFold, isIntersecting: false }]);
  assert.ok(belowFold.classes.has('scroll-reveal-pending'));

  observer.emit([{ target: belowFold, isIntersecting: true }]);
  assert.ok(belowFold.classes.has('scroll-reveal-visible'));
  assert.ok(!belowFold.classes.has('scroll-reveal-pending'));
  assert.deepEqual(observer.unobserved, [belowFold]);
});

test('page reveals are measured from the new page top after navigating while scrolled down', () => {
  const Observer = fakeObserverClass();
  const currentViewportSection = makeElement(-500);
  const belowInitialViewport = makeElement(280);
  const root = { querySelectorAll: () => [currentViewportSection, belowInitialViewport] };

  const observer = observePageSections({
    root,
    viewportHeight: 640,
    documentScrollTop: 500,
    prefersReducedMotion: false,
    IntersectionObserverImpl: Observer,
  });

  assert.deepEqual(observer.observed, [belowInitialViewport]);
});

test('page sections stay immediately visible when reduced motion is requested', () => {
  const Observer = fakeObserverClass();
  const belowFold = makeElement(720);
  const root = { querySelectorAll: () => [belowFold] };

  const observer = observePageSections({
    root,
    viewportHeight: 640,
    prefersReducedMotion: true,
    IntersectionObserverImpl: Observer,
  });

  assert.equal(observer, null);
  assert.equal(Observer.instances.length, 0);
  assert.equal(belowFold.classes.size, 0);
});

test('an explicit immersive setting keeps scroll reveals despite the system reduced-motion preference', () => {
  const Observer = fakeObserverClass();
  const belowFold = makeElement(720);
  const root = { querySelectorAll: () => [belowFold] };

  const observer = observePageSections({
    root,
    viewportHeight: 640,
    prefersReducedMotion: true,
    motionIntensity: 'immersive',
    IntersectionObserverImpl: Observer,
  });

  assert.ok(observer);
  assert.deepEqual(observer.observed, [belowFold]);
  assert.ok(belowFold.classes.has('scroll-reveal-pending'));
});

test('page sections remain visible when IntersectionObserver is unavailable', () => {
  const belowFold = makeElement(720);
  const root = { querySelectorAll: () => [belowFold] };

  const observer = observePageSections({
    root,
    viewportHeight: 640,
    prefersReducedMotion: false,
    IntersectionObserverImpl: undefined,
  });

  assert.equal(observer, null);
  assert.equal(belowFold.classes.size, 0);
});

test('route renders wire scroll reveals to a staged section entrance', async () => {
  const app = await readFile(new URL('../src/app.js', import.meta.url), 'utf8');
  const build = await readFile(new URL('../scripts/build.mjs', import.meta.url), 'utf8');
  const styles = await readFile(new URL('../src/styles.css', import.meta.url), 'utf8');

  assert.match(app, /pageRevealObserver\?\.disconnect\(\)[\s\S]*?const enteringPage = pageTransition;[\s\S]*?root\.innerHTML = renderLayout\(\);[\s\S]*?if \(enteringPage\)[\s\S]*?observePageSections/);
  assert.match(build, /\.\.\/src\/ui\/scrollReveal\.js/);
  assert.match(styles, /@keyframes scroll-section-enter[\s\S]*?translateY\(44px\) scale\(\.96\)[\s\S]*?translateY\(-3px\)/);
  assert.match(styles, /@media \(prefers-reduced-motion: no-preference\)[\s\S]*?\.scroll-reveal-visible\s*\{[^}]*animation:\s*scroll-section-enter/s);
  assert.match(styles, /@media \(prefers-reduced-motion: reduce\)[\s\S]*?\.scroll-reveal-pending,[\s\S]*?opacity:\s*1 !important/s);
});
