import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { buildResearchFindings } from '../src/data/findings.js';
import { installAccountBrowserAPIs, memoryLocalStorage, seedUnlockedTestAccount, unlockTestAccount } from './helpers/accountTestHarness.js';

const dataset = JSON.parse(await readFile(new URL('../public/data.json', import.meta.url), 'utf8'));

test('research findings derive sample coverage, score distribution, and evidence gaps from the dataset', () => {
  const findings = buildResearchFindings(dataset);
  const byId = Object.fromEntries(findings.map((finding) => [finding.id, finding]));

  assert.deepEqual(byId['coverage-2024'].facts, {
    samplePositions: 95,
    sampleRecruits: 197,
    reportedPositions: [93, 97],
    reportedRecruits: [142, 199],
  });
  assert.deepEqual(byId['coverage-2026'].facts, {
    samplePositions: 86,
    sampleRecruits: 136,
    reportedPositions: [88, 88],
    reportedRecruits: [138, 138],
  });
  assert.deepEqual(byId['score-sample-2026'].facts, {
    sampleRows: 122,
    sampleRecruits: 425,
    minimum: 98,
    maximum: 142,
    median: 126,
    linkedRows: 100,
    ambiguousRows: 17,
    unmatchedRows: 5,
    scope: '昌平区、房山区、海淀区、通州区财政局岗位最低进面线样本（2岗）、西城区、延庆区岗位最低进面线部分样本',
  });
  assert.deepEqual(byId['qualification-coverage'].facts, {
    positions: 695,
    structuredRequirements: 11,
    completeEligibility: 0,
    officialPositionRows: 0,
  });
  assert.deepEqual(byId['competition-grain'].facts, {
    observations: 62,
    jobLevelObservations: 56,
    aggregateObservations: 6,
    jobLevelPositions: 26,
  });
  assert.match(byId['competition-grain'].title, /岗位级资格审查快照/);
  assert.ok(byId['coverage-2026'].sourceIds.includes('huatu-2026-list'));
  assert.ok(byId['score-sample-2026'].sourceIds.includes('cgzj-2026-cutoff-sample'));
  assert.ok(byId['score-sample-2026'].sourceIds.includes('cgzj-2026-haidian-cutoff-sample'));
  assert.ok(byId['score-sample-2026'].sourceIds.includes('cgzj-2026-xicheng-cutoff-sample'));
  assert.ok(byId['score-sample-2026'].sourceIds.includes('cgzj-2026-yanqing-cutoff-sample'));
  assert.ok(byId['score-sample-2026'].sourceIds.includes('cgzj-2026-fangshan-cutoff-sample'));
  assert.ok(byId['score-sample-2026'].sourceIds.includes('cgzj-2026-tongzhou-fiscal-cutoff-sample'));
  assert.ok(byId['competition-grain'].sourceIds.includes('eoffcn-2025-tongzhou-final-day-snapshot'));
});

test('the research route presents expandable source lineage and its topic filter updates the visible findings', async () => {
  const datasetForApp = JSON.parse(await readFile(new URL('../public/data.json', import.meta.url), 'utf8'));
  const listeners = {};
  const root = { innerHTML: '' };
  globalThis.document = {
    title: '',
    documentElement: { dataset: {}, classList: { toggle() {} } },
    querySelector(selector) {
      return selector === '#root' ? root : { innerHTML: '', textContent: '', classList: { add() {}, remove() {} } };
    },
    addEventListener(type, handler) { listeners[type] = handler; },
  };
  globalThis.window = { addEventListener() {}, matchMedia: () => ({ matches: false }) };
  globalThis.location = { hash: '#/research' };
  globalThis.localStorage = memoryLocalStorage();
  installAccountBrowserAPIs();
  const accountId = await seedUnlockedTestAccount(globalThis.localStorage);
  globalThis.fetch = async () => ({ ok: true, json: async () => datasetForApp });
  await import(`../src/app.js?research-test=${Date.now()}`);
  for (let attempt = 0; attempt < 5 && !root.innerHTML; attempt += 1) await new Promise(setImmediate);
  await unlockTestAccount(listeners, accountId);

  assert.match(root.innerHTML, /<h1>研究结论<\/h1>/);
  assert.match(root.innerHTML, /2026 年昌平区来源清单列出 86 条岗位样例/);
  assert.match(root.innerHTML, /95 条职位样例/);
  assert.match(root.innerHTML, /查看证据与限制/);
  assert.match(root.innerHTML, /href="#\/evidence"/);
  assert.match(root.innerHTML, /href="#\/sources"/);

  const scoreFilter = { dataset: { action: 'filter-research-topic', topic: '分数样本' } };
  await listeners.click({ target: { closest: (selector) => selector === '[data-action]' ? scoreFilter : null } });

  assert.match(root.innerHTML, /data-topic="分数样本" aria-pressed="true">/);
  assert.match(root.innerHTML, /122 条/);
  assert.doesNotMatch(root.innerHTML, /class="research-finding[^\"]*"[^>]*data-topic="岗位覆盖"/);
});
