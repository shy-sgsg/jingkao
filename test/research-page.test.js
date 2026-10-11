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
    sampleRows: 365,
    sampleRecruits: 853,
    minimum: 52.15,
    maximum: 142,
    median: 125.75,
    linkedRows: 302,
    ambiguousRows: 47,
    unmatchedRows: 16,
    scope: '朝阳区岗位最低进面分部分样本、昌平区、大兴区岗位最低进面分部分样本、东城区部分职位的最低进面分；非全区完整名册、房山区、丰台区、海淀区、怀柔区、密云区岗位最低进面分部分样本、平谷区、石景山区、顺义区、北京街道、北京市财政局岗位最低进面线部分样本（本库当前已映射6岗）、西城区、延庆区岗位最低进面线部分样本',
  });
  assert.deepEqual(byId['qualification-coverage'].facts, {
    positions: 867,
    structuredRequirements: 12,
    completeEligibility: 0,
    officialPositionRows: 0,
  });
  assert.deepEqual(byId['competition-grain'].facts, {
    observations: 762,
    jobLevelObservations: 719,
    aggregateObservations: 43,
    jobLevelPositions: 541,
    qualificationSnapshots: 221,
    reportedApplicationSnapshots: 498,
  });
  assert.match(byId['competition-grain'].title, /岗位级竞争观察/);
  assert.ok(byId['competition-grain'].sourceIds.includes('huatu-2025-first-day-20241118-1800'));
  assert.ok(byId['coverage-2026'].sourceIds.includes('huatu-2026-list'));
  assert.ok(byId['score-sample-2026'].sourceIds.includes('cgzj-2026-cutoff-sample'));
  assert.ok(byId['score-sample-2026'].sourceIds.includes('cgzj-2026-haidian-cutoff-sample'));
  assert.ok(byId['score-sample-2026'].sourceIds.includes('cgzj-2026-xicheng-cutoff-sample'));
  assert.ok(byId['score-sample-2026'].sourceIds.includes('cgzj-2026-yanqing-cutoff-sample'));
  assert.ok(byId['score-sample-2026'].sourceIds.includes('cgzj-2026-fangshan-cutoff-sample'));
  assert.ok(byId['score-sample-2026'].sourceIds.includes('cgzj-2026-tongzhou-fiscal-cutoff-sample'));
  assert.ok(byId['score-sample-2026'].sourceIds.includes('cgzj-2026-chaoyang-cutoff-sample'));
  assert.ok(byId['score-sample-2026'].sourceIds.includes('cgzj-2026-daxing-cutoff-sample'));
  assert.ok(byId['score-sample-2026'].sourceIds.includes('cgzj-2026-shijingshan-cutoff-sample'));
  assert.ok(byId['score-sample-2026'].sourceIds.includes('cgzj-2026-fengtai-cutoff-sample'));
  assert.ok(byId['score-sample-2026'].sourceIds.includes('cgzj-2026-shunyi-cutoff-sample'));
  assert.ok(byId['score-sample-2026'].sourceIds.includes('cgzj-2026-pinggu-cutoff-sample'));
  assert.ok(byId['score-sample-2026'].sourceIds.includes('cgzj-2026-street-cutoff-sample'));
  assert.ok(byId['competition-grain'].sourceIds.includes('eoffcn-2025-citywide-hot-jobs-20241122-0900'));
  for (const sourceId of [
    'changping-2026-fenbi-page-1', 'shijingshan-2026-fenbi-page-1', 'huairou-2026-fenbi-page-1',
    'yanqing-2026-fenbi-page-1', 'shunyi-2026-fenbi-page-1', 'pinggu-2026-fenbi-page-1', 'miyun-2026-fenbi-page-1',
  ]) assert.ok(byId['competition-grain'].sourceIds.includes(sourceId));
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
  assert.match(root.innerHTML, /365 条/);
  assert.match(root.innerHTML, /报考人数 498 条/);
  assert.doesNotMatch(root.innerHTML, /class="research-finding[^\"]*"[^>]*data-topic="岗位覆盖"/);
});
