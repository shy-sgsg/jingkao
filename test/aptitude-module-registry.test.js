import test from 'node:test';
import assert from 'node:assert/strict';

const registry = await import('../src/aptitude/modules.js').catch(() => ({}));

test('all seven aptitude areas have unique module, task, route, and record identities', () => {
  assert.ok(Array.isArray(registry.APTITUDE_MODULES));
  assert.equal(registry.APTITUDE_MODULES.length, 7);
  assert.deepEqual(new Set(registry.APTITUDE_MODULES.map((item) => item.id)), new Set([
    'political-theory', 'general-knowledge', 'verbal', 'quantitative', 'reasoning', 'science', 'data-analysis',
  ]));
  for (const key of ['id', 'taskType', 'route', 'recordArea']) {
    const values = registry.APTITUDE_MODULES.map((item) => item[key]);
    assert.ok(values.every((value) => typeof value === 'string' && value.length > 0));
    assert.equal(new Set(values).size, values.length, `${key} must be unique`);
  }
  assert.equal(registry.getAptitudeModule('political-theory').area, '政治理论');
  assert.equal(registry.getAptitudeModule('political-theory').taskType, 'political_theory');
  assert.equal(registry.getAptitudeModule('missing'), null);
});

test('registered aptitude modules derive the legacy mock groups without splitting political and general knowledge', () => {
  const modules = registry.getAptitudeMockModules();
  const combined = modules.filter(([id]) => id === 'politicalAndGeneral');
  assert.equal(combined.length, 1);
  assert.equal(combined[0][1], '政治理论 + 常识');
  assert.equal(modules.length, 6);
  assert.deepEqual(modules[0], ['dataAnalysis', '资料分析']);
});
