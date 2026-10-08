import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { runViewTransition } from '../src/ui/viewTransition.js';

test('route entry uses one short page transition instead of animating every descendant', async () => {
  const styles = await readFile(new URL('../src/styles.css', import.meta.url), 'utf8');
  const rules = [...styles.matchAll(/([^{}]+)\{([^{}]*)\}/g)]
    .map(([, selector, declarations]) => ({ selector: selector.trim(), declarations }))
    .filter(({ selector }) => !selector.startsWith('@media'));
  const routeDescendantAnimations = rules.filter(({ selector, declarations }) =>
    selector.split(',').some((part) => /\.page-shell\.page-enter\s+/.test(part.trim()))
      && /(?:^|;)\s*animation(?:-[\w-]+)?\s*:/i.test(declarations));
  const fallbackEntry = rules.find(({ selector }) => selector === '.page-shell.page-enter');
  const browserEntry = rules.find(({ selector }) => selector === '::view-transition-new(main-content)');
  const durationOf = (declarations) => Number(declarations.match(/animation:\s*[^;]*?(\d+)ms/)?.[1]);

  assert.deepEqual(routeDescendantAnimations, [], 'route changes should not start a second animation on each card, section, chart, or row');
  assert.ok(durationOf(fallbackEntry?.declarations || '') <= 300, 'the non-View-Transition fallback should finish quickly');
  assert.ok(durationOf(browserEntry?.declarations || '') <= 300, 'the browser snapshot transition should finish quickly');
});

test('view transition falls back to the update callback when the browser API is unavailable', () => {
  let updates = 0;
  const result = runViewTransition({}, () => { updates += 1; });

  assert.equal(updates, 1);
  assert.equal(result, null);
});

test('view transition delegates the update and returns the browser transition handle', () => {
  let updates = 0;
  const handle = { finished: Promise.resolve() };
  const documentLike = {
    startViewTransition(update) {
      update();
      return handle;
    },
  };

  const result = runViewTransition(documentLike, () => { updates += 1; });

  assert.equal(updates, 1);
  assert.equal(result, handle);
});

test('view transition skips snapshots when reduced motion is requested', () => {
  let updates = 0;
  let transitionCalls = 0;
  const documentLike = {
    defaultView: { matchMedia: () => ({ matches: true }) },
    startViewTransition() { transitionCalls += 1; },
  };

  const result = runViewTransition(documentLike, () => { updates += 1; });

  assert.equal(updates, 1);
  assert.equal(transitionCalls, 0);
  assert.equal(result, null);
});

test('an explicit immersive setting overrides the system reduced-motion preference', () => {
  let updates = 0;
  let transitionCalls = 0;
  const documentLike = {
    defaultView: { matchMedia: () => ({ matches: true }) },
    startViewTransition(update) { transitionCalls += 1; update(); return { finished: Promise.resolve() }; },
  };

  const result = runViewTransition(documentLike, () => { updates += 1; }, 'immersive');

  assert.equal(updates, 1);
  assert.equal(transitionCalls, 1);
  assert.ok(result);
});
