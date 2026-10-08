import test from 'node:test';
import assert from 'node:assert/strict';
import { advanceOnboarding, shouldShowOnboarding } from '../src/data/onboarding.js';

test('new users see the guide, while completed or deferred guides stay dismissed', () => {
  assert.equal(shouldShowOnboarding(undefined), true);
  assert.equal(shouldShowOnboarding({ completed: true }), false);
  assert.equal(shouldShowOnboarding({ hidden: true }), false);
});

test('onboarding advances through four steps and completes after the last step', () => {
  assert.deepEqual(advanceOnboarding(0), { step: 1, hidden: false, completed: false });
  assert.deepEqual(advanceOnboarding(2), { step: 3, hidden: false, completed: false });
  assert.deepEqual(advanceOnboarding(3), { step: 0, hidden: true, completed: true });
});

test('users can go back or defer without marking the guide complete', () => {
  assert.deepEqual(advanceOnboarding(2, 'back'), { step: 1, hidden: false, completed: false });
  assert.deepEqual(advanceOnboarding(2, 'later'), { step: 2, hidden: true, completed: false });
});
