import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const projectRoot = new URL('../', import.meta.url);

test('2024–2025 Mentougou mirror rows reconcile to their listings and assign by actual unit', async () => {
  const seed = JSON.parse(await readFile(new URL('data/positions_seed.json', projectRoot), 'utf8'));
  const published = JSON.parse(await readFile(new URL('public/data.json', projectRoot), 'utf8'));
  const sources = JSON.parse(await readFile(new URL('data/source_registry.json', projectRoot), 'utf8'));
  const sourceById = new Map(sources.map((source) => [source.sourceId, source]));
  const expectations = [
    { year: 2024, prefix: 'mentougou-2024-huatu-list', rows: 72, recruits: 141 },
    { year: 2025, prefix: 'mentougou-2025-gwy-page-', rows: 77, recruits: 149 },
  ];

  for (const expected of expectations) {
    const rows = seed.filter((row) => row.year === expected.year
      && row.sources.some((sourceId) => sourceId.startsWith(expected.prefix)));
    assert.equal(rows.length, expected.rows, `${expected.year} candidate row count`);
    assert.equal(new Set(rows.map((row) => row.code)).size, expected.rows, `${expected.year} codes are unique`);
    assert.equal(rows.reduce((sum, row) => sum + row.recruitCount, 0), expected.recruits, `${expected.year} recruits`);
    assert.ok(rows.every((row) => row.code && row.unit && row.title && row.education && row.majorText));
    assert.ok(rows.every((row) => row.sourceLevel === 'secondary' && row.crossVerified === false));
    assert.ok(rows.every((row) => row.eligibilityComplete === false));
    assert.ok(rows.every((row) => row.sources.every((sourceId) => sourceById.get(sourceId)?.level === 'secondary')));
  }

  const detailSources = sources.filter((source) => source.sourceId.startsWith('mentougou-2025-gwy-page-'));
  assert.equal(detailSources.length, 35);
  const rows2025 = seed.filter((row) => row.year === 2025
    && row.sources.some((sourceId) => sourceId.startsWith('mentougou-2025-gwy-page-')));
  for (const source of detailSources) {
    const linked = rows2025.filter((row) => row.sources.includes(source.sourceId));
    assert.equal(linked.length, source.reportedPositionCount, source.sourceId);
    assert.equal(linked.reduce((sum, row) => sum + row.recruitCount, 0), source.reportedRecruitCount, source.sourceId);
  }

  const districtRows = published.positions.filter((row) => row.districtId === 'mentougou');
  assert.deepEqual(
    [2024, 2025].map((year) => {
      const rows = districtRows.filter((row) => row.year === year);
      return [rows.length, rows.reduce((sum, row) => sum + row.recruitCount, 0)];
    }),
    [[72, 141], [77, 149]],
  );
});
