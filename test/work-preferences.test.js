import test from 'node:test';
import assert from 'node:assert/strict';
import * as decision from '../src/data/decision.js';

test('explicit job conditions surface conflicts against confirmed work preferences', () => {
  assert.equal(typeof decision.evaluateWorkPreferences, 'function', 'the assistant needs a separate work-preference check');

  const result = decision.evaluateWorkPreferences({
    title: '综合行政执法岗',
    jobType: '行政执法',
    physicalTest: true,
    eligibilityText: '需参加体能测试，夜班和值守较多。',
    orgType: '镇',
  }, {
    acceptAdministrativeEnforcement: '不接受',
    acceptPhysicalTest: '不接受',
    acceptNightShift: '不接受',
    acceptTown: '不接受',
    prioritizeStreet: '优先',
    prioritizeDistrict: '待确认',
  });

  assert.deepEqual(Object.fromEntries(result.items.map(({ key, status }) => [key, status])), {
    acceptAdministrativeEnforcement: 'conflict',
    acceptPhysicalTest: 'conflict',
    acceptNightShift: 'conflict',
    acceptTown: 'conflict',
    prioritizeStreet: 'not-prioritized',
    prioritizeDistrict: 'unknown',
  });
});

test('missing job evidence stays unknown and a soft priority never becomes a hard conflict', () => {
  assert.equal(typeof decision.evaluateWorkPreferences, 'function', 'the assistant needs a separate work-preference check');

  const unknown = decision.evaluateWorkPreferences({}, {
    acceptPhysicalTest: '不接受',
    acceptNightShift: '不接受',
    prioritizeStreet: '待确认',
  });
  assert.deepEqual(unknown.items.map(({ status }) => status), ['unknown', 'unknown', 'unknown', 'unknown', 'unknown', 'unknown']);

  const known = decision.evaluateWorkPreferences({
    title: '综合管理岗',
    jobType: '综合管理',
    physicalTest: false,
    eligibilityText: '无需夜班。',
    orgType: '区直',
  }, {
    acceptAdministrativeEnforcement: '不接受',
    acceptPhysicalTest: '不接受',
    acceptNightShift: '不接受',
    acceptTown: '不接受',
    prioritizeStreet: '优先',
    prioritizeDistrict: '不优先',
  });
  assert.deepEqual(Object.fromEntries(known.items.map(({ key, status }) => [key, status])), {
    acceptAdministrativeEnforcement: 'match',
    acceptPhysicalTest: 'match',
    acceptNightShift: 'match',
    acceptTown: 'match',
    prioritizeStreet: 'not-prioritized',
    prioritizeDistrict: 'neutral',
  });
});
