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
    sampleRows: 31,
    sampleRecruits: 79,
    minimum: 106.25,
    maximum: 139.5,
    median: 127.75,
    linkedRows: 25,
    ambiguousRows: 6,
  });
  assert.deepEqual(byId['qualification-coverage'].facts, {
    positions: 86,
    structuredRequirements: 11,
    completeEligibility: 0,
    officialPositionRows: 0,
  });
  assert.deepEqual(byId['competition-grain'].facts, {
    observations: 13,
    jobLevelObservations: 9,
    aggregateObservations: 4,
    jobLevelPositions: 2,
  });
  assert.match(byId['competition-grain'].title, /岗位级资格审查快照/);
  assert.ok(byId['coverage-2026'].sourceIds.includes('huatu-2026-list'));
  assert.ok(byId['score-sample-2026'].sourceIds.includes('cgzj-2026-cutoff-sample'));
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
  assert.match(root.innerHTML, /2026 年收录 86 条岗位样例/);
  assert.match(root.innerHTML, /95 条职位样例/);
  assert.match(root.innerHTML, /查看证据与限制/);
  assert.match(root.innerHTML, /href="#\/evidence"/);
  assert.match(root.innerHTML, /href="#\/sources"/);

  const scoreFilter = { dataset: { action: 'filter-research-topic', topic: '分数样本' } };
  await listeners.click({ target: { closest: (selector) => selector === '[data-action]' ? scoreFilter : null } });

  assert.match(root.innerHTML, /data-topic="分数样本" aria-pressed="true">/);
  assert.match(root.innerHTML, /31 条/);
  assert.doesNotMatch(root.innerHTML, /class="research-finding[^\"]*"[^>]*data-topic="岗位覆盖"/);
});
