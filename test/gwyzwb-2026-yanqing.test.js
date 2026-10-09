import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const projectRoot = new URL('../', import.meta.url);

test('2026 Yanqing mirror sample keeps row-level provenance and reports partial coverage honestly', async () => {
  const seed = JSON.parse(await readFile(new URL('data/positions_seed.json', projectRoot), 'utf8'));
  const published = JSON.parse(await readFile(new URL('public/data.json', projectRoot), 'utf8'));
  const sources = JSON.parse(await readFile(new URL('data/source_registry.json', projectRoot), 'utf8'));
  const expectedCodes = [
    "242503301","242503302","244104001","829909101","526013401","526013402","526013403","526013404",
    "821778101","821778201","821778601","821778701","821778702","821779103",
    "121780001","121780002","221778301","221778401","221778801","821778901","221778902",
    "221779001","221779002","221779101","221779102","221779201","221779202","221779301","221779302",
    "221779501","221779601","221779701","221779801","241779502","241779503","241780201","821779401",
    "243106901","625015501","625015502","821779901","821779902","821779903","241780501","241780601","241780602","241780801",
    "241780301","241780302"
  ];
  const rows = seed.filter((row) => row.year === 2026 && expectedCodes.includes(row.code));
  assert.deepEqual(rows.map((row) => row.code).sort(), [...expectedCodes].sort());
  assert.equal(rows.length, 49);
  assert.equal(rows.reduce((sum, row) => sum + row.recruitCount, 0), 116);

  const sourceById = new Map(sources.map((source) => [source.sourceId, source]));
  for (const row of rows) {
    assert.equal(row.eligibilityComplete, false);
    assert.equal(row.crossVerified, false);
    assert.equal(row.sourceLevel, 'secondary');
    assert.equal(sourceById.get(row.sources[0])?.level, 'secondary');
    assert.ok(row.majorText);
    assert.ok(published.positions.some((item) => item.year === 2026 && item.code === row.code && item.districtId === 'yanqing'));
  }

  const summary = sourceById.get('huatu-2026-yanqing-list');
  assert.equal(summary?.reportedPositionCount, 54);
  assert.equal(summary?.reportedRecruitCount, 123);
  assert.ok(rows.length < summary.reportedPositionCount, 'do not imply full district coverage');

  const pageOne = sourceById.get('xduim-2026-yanqing-page-1');
  const pageOneRows = rows.filter((row) => row.sources.includes(pageOne?.sourceId));
  assert.equal(pageOne?.reportedPositionCount, 20);
  assert.equal(pageOne?.reportedRecruitCount, 42);
  assert.equal(pageOneRows.length, pageOne.reportedPositionCount);
  assert.equal(pageOneRows.reduce((sum, row) => sum + row.recruitCount, 0), pageOne.reportedRecruitCount);

  for (const source of sources.filter((item) => item.sourceId.startsWith('gwyzwb-2026-yanqing-org-'))) {
    const linked = rows.filter((row) => row.sources.includes(source.sourceId));
    assert.equal(linked.length, source.reportedPositionCount, source.sourceId);
    assert.equal(linked.reduce((sum, row) => sum + row.recruitCount, 0), source.reportedRecruitCount, source.sourceId);
  }

  for (const source of sources.filter((item) => item.sourceId.startsWith('gwyzwb-2026-yanqing-role-') || item.sourceId.startsWith('offcn-2026-yanqing-role-'))) {
    const linked = rows.filter((row) => row.sources.includes(source.sourceId));
    assert.equal(linked.length, source.reportedPositionCount, source.sourceId);
    assert.equal(linked.reduce((sum, row) => sum + row.recruitCount, 0), source.reportedRecruitCount, source.sourceId);
  }
});
