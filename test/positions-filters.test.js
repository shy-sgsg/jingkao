import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { classifyPublicManagementMatch } from '../src/data/positions.js';
import { installAccountBrowserAPIs, memoryLocalStorage, seedUnlockedTestAccount, unlockTestAccount } from './helpers/accountTestHarness.js';

async function renderPositionApp() {
  const dataset = JSON.parse(await readFile(new URL('../public/data.json', import.meta.url), 'utf8'));
  const listeners = {};
  const root = { innerHTML: '' };
  const modalRoot = { innerHTML: '', querySelector: () => null };
  const toastRoot = { textContent: '', classList: { add() {}, remove() {} } };
  const documentElement = { dataset: {}, classList: { toggle() {} } };
  const getAdvancedOpen = () => {
    const tag = root.innerHTML.match(/<details id="job-advanced-filters"[^>]*>/)?.[0] || '';
    return /\sopen(?:\s|>)/.test(tag);
  };
  const setAdvancedOpen = (open) => {
    root.innerHTML = root.innerHTML.replace(/<details id="job-advanced-filters"[^>]*>/, (tag) => {
      const closedTag = tag.replace(/\sopen(?=\s|>)/, '');
      return open ? closedTag.replace('>', ' open>') : closedTag;
    });
  };
  const advancedDetails = Object.defineProperty({}, 'open', {
    get: getAdvancedOpen,
    set: setAdvancedOpen,
  });
  globalThis.document = {
    title: '',
    documentElement,
    querySelector(selector) {
      if (selector === '#root') return root;
      if (selector === '#modal-root') return modalRoot;
      if (selector === '#toast') return toastRoot;
      if (selector === '#job-advanced-filters') return advancedDetails;
      return { innerHTML: '', textContent: '', classList: { add() {}, remove() {} }, focus() {} };
    },
    getElementById(id) {
      if (id === 'job-advanced-filters') return advancedDetails;
      return { focus() {} };
    },
    addEventListener(type, handler) { listeners[type] = handler; },
  };
  globalThis.window = { addEventListener() {}, matchMedia: () => ({ matches: false }) };
  globalThis.location = { hash: '#/positions' };
  globalThis.localStorage = memoryLocalStorage();
  installAccountBrowserAPIs();
  const accountId = await seedUnlockedTestAccount(globalThis.localStorage);
  globalThis.fetch = async () => ({ ok: true, json: async () => dataset });
  await import(`../src/app.js?positions-filter-test=${Date.now()}`);
  for (let attempt = 0; attempt < 5 && !root.innerHTML; attempt += 1) await new Promise(setImmediate);
  await unlockTestAccount(listeners, accountId);
  return { dataset, listeners, root, modalRoot, advancedDetails };
}

test('position library filters real rows and keeps advanced controls open after changes', async () => {
  const { dataset, listeners, root, advancedDetails } = await renderPositionApp();
  const positionWithoutPoliticalCondition = dataset.positions.find((position) => !position.requirements?.politicalStatus && !position.politicalStatus);
  assert.ok(positionWithoutPoliticalCondition);
  assert.match(root.innerHTML, /<details id="job-advanced-filters"/);
  assert.match(root.innerHTML, /id="job-unit"/);
  assert.match(root.innerHTML, /id="job-education"/);
  assert.match(root.innerHTML, /id="job-politics"[\s\S]*?value="__missing"/);
  assert.match(root.innerHTML, /id="job-graduation"[\s\S]*?value="应届毕业生（2025）"/);
  assert.match(root.innerHTML, /id="job-recruitment"/);
  assert.match(root.innerHTML, /id="job-physical-test"/);
  assert.match(root.innerHTML, /id="job-professional-test"/);
  assert.match(root.innerHTML, /data-action="toggle-major-review"/);
  assert.match(root.innerHTML, /可能相关[^<]*人工核对/);
  assert.match(root.innerHTML, /未列入目标代码/);
  assert.match(root.innerHTML, /专业文本缺失/);
  assert.match(root.innerHTML, /未列明仅表示来源未提供，不表示不限或不符合/);

  const unit = positionWithoutPoliticalCondition.unit;
  const unitCount = dataset.positions.filter((position) => position.unit === unit).length;
  advancedDetails.open = true;
  await listeners.change({ target: { id: 'job-unit', value: unit } });

  assert.match(root.innerHTML, new RegExp(`<span class="filter-count">${unitCount} 条结果</span>`));
  assert.match(root.innerHTML, /<details id="job-advanced-filters"[^>]*\sopen>/);
  const visibleKeys = [...root.innerHTML.matchAll(/class="position-title-link" data-action="open-job" data-position-key="([^"]+)"/g)].map((match) => match[1]);
  assert.ok(visibleKeys.length > 0);
  assert.ok(visibleKeys.every((key) => dataset.positions.find((position) => `${position.year}:${position.code}` === key)?.unit === unit));

  const unknownPoliticalCount = dataset.positions.filter((position) => position.unit === unit && !position.requirements?.politicalStatus && !position.politicalStatus).length;
  await listeners.change({ target: { id: 'job-politics', value: '__missing' } });
  assert.match(root.innerHTML, new RegExp(`<span class="filter-count">${unknownPoliticalCount} 条结果</span>`));
  assert.match(root.innerHTML, /<details id="job-advanced-filters"[^>]*\sopen>/);

  await listeners.change({ target: { id: 'job-unit', value: 'all' } });
  await listeners.change({ target: { id: 'job-politics', value: 'all' } });
  const reviewAction = { dataset: { action: 'toggle-major-review' } };
  await listeners.click({ target: { closest: (selector) => (selector === '[data-action]' ? reviewAction : null) } });
  const manualReviewPositions = dataset.positions.filter((position) => classifyPublicManagementMatch(position).status === 'manual-review');
  assert.match(root.innerHTML, new RegExp(`<span class="filter-count">${manualReviewPositions.length} 条结果</span>`));
  const reviewKeys = [...root.innerHTML.matchAll(/class="position-title-link" data-action="open-job" data-position-key="([^"]+)"/g)].map((match) => match[1]);
  assert.ok(reviewKeys.length > 0);
  assert.ok(reviewKeys.every((key) => classifyPublicManagementMatch(dataset.positions.find((position) => `${position.year}:${position.code}` === key)).status === 'manual-review'));

  await listeners.click({ target: { closest: (selector) => (selector === '[data-action]' ? reviewAction : null) } });
  assert.match(root.innerHTML, new RegExp(`<span class="filter-count">${dataset.positions.length} 条结果</span>`));
});

test('district selector limits the visible sample to records assigned to that district', async () => {
  const { dataset, listeners, root } = await renderPositionApp();
  const yanqing = dataset.positions.filter((position) => position.districtId === 'yanqing');
  assert.ok(yanqing.length > 0);
  assert.match(root.innerHTML, /id="job-district"/);

  await listeners.change({ target: { id: 'job-district', value: 'yanqing' } });

  assert.match(root.innerHTML, new RegExp(`<span class="filter-count">${yanqing.length} 条结果</span>`));
  assert.match(root.innerHTML, /<option value="yanqing" selected>/);
  const yanqingKeys = new Set(yanqing.map((position) => `${position.year}:${position.code}`));
  const visibleKeys = [...root.innerHTML.matchAll(/class="position-title-link" data-action="open-job" data-position-key="([^"]+)"/g)]
    .map((match) => match[1]);
  assert.ok(visibleKeys.length > 0);
  assert.ok(visibleKeys.every((key) => yanqingKeys.has(key)));
});

test('position library filters and sorts by exact-position competition snapshots and mapped cutoff evidence', async () => {
  const { dataset, listeners, root, modalRoot } = await renderPositionApp();
  const yearPositions = dataset.positions.filter((position) => Number(position.year) === 2026 && position.districtId === 'changping');
  const snapshotCodes = new Set(dataset.observations
    .filter((item) => Number(item.year) === 2026 && item.observationType === 'qualified_snapshot'
      && ['position-level', 'position', '岗位级'].includes(item.scope) && item.positionCode)
    .map((item) => item.positionCode));
  const expectedSnapshotPositions = yearPositions.filter((position) => snapshotCodes.has(position.code));
  const exactCutoffRows = dataset.scoreRows.filter((row) => Number(row.year) === 2026
    && row.mappingConfidence === 'high' && row.positionCode
    && yearPositions.some((position) => position.code === row.positionCode && position.unit === row.unit && position.title === row.title));
  const expectedCutoffPositions = [...new Set(exactCutoffRows.map((row) => row.positionCode))];
  assert.ok(expectedSnapshotPositions.length > 0);
  assert.ok(expectedCutoffPositions.length > 0);

  await listeners.change({ target: { id: 'job-district', value: 'changping' } });
  await listeners.change({ target: { id: 'job-year', value: '2026' } });
  await listeners.change({ target: { id: 'job-competition-evidence', value: 'has' } });

  const snapshotKeys = [...root.innerHTML.matchAll(/class="position-title-link" data-action="open-job" data-position-key="([^"]+)"/g)]
    .map((match) => match[1]);
  assert.deepEqual(snapshotKeys.sort(), expectedSnapshotPositions.map((position) => `${position.year}:${position.code}`).sort());
  assert.match(root.innerHTML, /id="job-competition-evidence"/);
  assert.match(root.innerHTML, /资格审查 1:307\.5/);
  assert.match(root.innerHTML, /2025-11-21 09:00 · 通过人数 \/ 计划招录/);

  await listeners.change({ target: { id: 'job-competition-evidence', value: 'all' } });
  await listeners.change({ target: { id: 'job-cutoff-evidence', value: 'has' } });
  const cutoffKeys = [...root.innerHTML.matchAll(/class="position-title-link" data-action="open-job" data-position-key="([^"]+)"/g)]
    .map((match) => match[1]);
  assert.deepEqual(cutoffKeys.sort(), expectedCutoffPositions.map((code) => `2026:${code}`).sort());

  await listeners.change({ target: { id: 'job-cutoff-evidence', value: 'all' } });
  await listeners.change({ target: { id: 'job-sort', value: 'competition-desc' } });
  const sortedSnapshotCodes = [...root.innerHTML.matchAll(/class="position-title-link" data-action="open-job" data-position-key="2026:([^"]+)"/g)]
    .map((match) => match[1])
    .filter((code) => snapshotCodes.has(code));
  assert.deepEqual(sortedSnapshotCodes.slice(0, 2), ['821261102', '821263001']);

  const openJobAction = { dataset: { action: 'open-job', positionKey: '2025:220527701' } };
  await listeners.click({ target: { closest: (selector) => (selector === '[data-action]' ? openJobAction : null) } });
  assert.match(modalRoot.innerHTML, /2024-11-21 09:00/);
  assert.match(modalRoot.innerHTML, /时点参考竞争比 1:177/);
  assert.match(modalRoot.innerHTML, /2024-11-21 18:00/);
  assert.match(modalRoot.innerHTML, /时点参考竞争比 1:245/);
  assert.match(modalRoot.innerHTML, /https:\/\/www\.huatu\.com\/2024\/1121\/2789842\.html/);
});
