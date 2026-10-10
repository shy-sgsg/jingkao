import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const projectRoot = new URL('../', import.meta.url);

test('2025 northeast district candidates reconcile by unit, district, and source page', async () => {
  const seed = JSON.parse(await readFile(new URL('data/positions_seed.json', projectRoot), 'utf8'));
  const published = JSON.parse(await readFile(new URL('public/data.json', projectRoot), 'utf8'));
  const sources = JSON.parse(await readFile(new URL('data/source_registry.json', projectRoot), 'utf8'));
  const sourceById = new Map(sources.map((source) => [source.sourceId, source]));
  const expectations = [
    { district: 'chaoyang', pageCount: 80, mirrorRows: 165, mirrorRecruits: 408, rows: 162, recruits: 403 },
    { district: 'shunyi', pageCount: 49, mirrorRows: 108, mirrorRecruits: 181, rows: 108, recruits: 181 },
    { district: 'pinggu', pageCount: 33, mirrorRows: 57, mirrorRecruits: 115, rows: 57, recruits: 115 },
    { district: 'miyun', pageCount: 44, mirrorRows: 82, mirrorRecruits: 158, rows: 82, recruits: 158 },
  ];
  const rows = seed.filter((row) => row.year === 2025
    && row.sources.some((sourceId) => sourceId.startsWith('northeast-2025-')));

  assert.equal(rows.length, 412);
  assert.equal(new Set(rows.map((row) => row.code)).size, 412);
  assert.equal(rows.reduce((sum, row) => sum + row.recruitCount, 0), 862);
  assert.ok(rows.every((row) => row.sourceLevel === 'secondary' && row.crossVerified === false));
  assert.ok(rows.every((row) => row.eligibilityComplete === false));

  for (const expected of expectations) {
    const pagePrefix = `northeast-2025-${expected.district}-page-`;
    const pageSources = sources.filter((source) => source.sourceId.startsWith(pagePrefix));
    assert.equal(pageSources.length, expected.pageCount, `${expected.district} source pages`);
    const sourceRows = rows.filter((row) => row.sources.some((sourceId) => sourceId.startsWith(pagePrefix)));
    assert.equal(sourceRows.length, expected.mirrorRows, `${expected.district} mirror rows`);
    assert.equal(sourceRows.reduce((sum, row) => sum + row.recruitCount, 0), expected.mirrorRecruits, `${expected.district} mirror recruits`);
    for (const source of pageSources) {
      const linked = sourceRows.filter((row) => row.sources.includes(source.sourceId));
      assert.equal(linked.length, source.reportedPositionCount, source.sourceId);
      assert.equal(linked.reduce((sum, row) => sum + row.recruitCount, 0), source.reportedRecruitCount, source.sourceId);
    }
  }

  const assigned = published.positions.filter((row) => row.year === 2025
    && ['chaoyang', 'dongcheng', 'shunyi', 'pinggu', 'miyun'].includes(row.districtId));
  assert.equal(assigned.filter((row) => row.districtId === 'chaoyang').length, 162);
  assert.equal(assigned.filter((row) => row.districtId === 'chaoyang').reduce((sum, row) => sum + row.recruitCount, 0), 403);
  const dongcheng = assigned.filter((row) => row.districtId === 'dongcheng'
    && ['230119401', '230119402', '230119403'].includes(row.code));
  assert.equal(dongcheng.length, 3);
  assert.equal(dongcheng.reduce((sum, row) => sum + row.recruitCount, 0), 5);
  assert.ok(dongcheng.every((row) => row.unit === '北京市东城区朝阳门街道'));

  for (const expected of expectations) {
    const districtRows = assigned.filter((row) => row.districtId === expected.district);
    assert.equal(districtRows.length, expected.rows, `${expected.district} published rows`);
    assert.equal(districtRows.reduce((sum, row) => sum + row.recruitCount, 0), expected.recruits);
    assert.ok(districtRows.every((row) => row.sources.every((sourceId) => sourceById.get(sourceId)?.level === 'secondary')));
  }
});
