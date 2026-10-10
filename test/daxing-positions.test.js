import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const projectRoot = new URL('../', import.meta.url);

test('2024–2025 Daxing position candidates are traceable and do not overstate district coverage', async () => {
  const seed = JSON.parse(await readFile(new URL('data/positions_seed.json', projectRoot), 'utf8'));
  const published = JSON.parse(await readFile(new URL('public/data.json', projectRoot), 'utf8'));
  const registry = JSON.parse(await readFile(new URL('data/source_registry.json', projectRoot), 'utf8'));
  const sourceById = new Map(registry.map((source) => [source.sourceId, source]));
  const expectations = [
    { year: 2024, prefix: 'daxing-2024-', rows: 83, recruits: 189 },
    { year: 2025, prefix: 'daxing-2025-gwy-page-', rows: 92, recruits: 183 },
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
    assert.ok(rows.every((row) => /官方职位表核验/.test(row.eligibilityText)));

    for (const row of rows) {
      const rowSources = row.sources.map((sourceId) => sourceById.get(sourceId));
      assert.ok(rowSources.every((source) => source?.level === 'secondary'), `${row.code} sources remain secondary`);
      assert.ok(rowSources.some((source) => source?.url), `${row.code} has a linked source URL`);
    }
  }

  const pageSources = registry.filter((source) => source.sourceId.startsWith('daxing-2025-gwy-page-'));
  assert.equal(pageSources.length, 42, 'each of the 42 unit detail pages is registered');
  const year2025 = seed.filter((row) => row.year === 2025 && row.sources.some((id) => id.startsWith('daxing-2025-gwy-page-')));
  for (const source of pageSources) {
    const linked = year2025.filter((row) => row.sources.includes(source.sourceId));
    assert.equal(linked.length, source.reportedPositionCount, source.sourceId);
    assert.equal(linked.reduce((sum, row) => sum + row.recruitCount, 0), source.reportedRecruitCount, source.sourceId);
  }

  const publishedDaxing = published.positions.filter((row) => row.districtId === 'daxing');
  for (const expected of [
    { year: 2024, rows: 82, recruits: 188 },
    { year: 2025, rows: 92, recruits: 183 },
    { year: 2026, rows: 12, recruits: 18 },
  ]) {
    const rows = publishedDaxing.filter((row) => row.year === expected.year);
    assert.equal(rows.length, expected.rows, `${expected.year} assigned to Daxing by supported unit names`);
    assert.equal(rows.reduce((sum, row) => sum + row.recruitCount, 0), expected.recruits);
  }

  assert.equal(published.positions.find((row) => row.year === 2024 && row.code === '829908107')?.districtId, null,
    'the municipal Statistics Bureau candidate stays unassigned');
  assert.deepEqual(
    published.positions.find((row) => row.year === 2024 && row.code === '121561601')?.majorCriteria?.undergraduate,
    ['0301', '04', '0503', '12'],
    'Daxing major codes are available to the eligibility decision module',
  );
});

test('2026 Daxing imports only rows with a recovered title and preserves the partial-page gap', async () => {
  const seed = JSON.parse(await readFile(new URL('data/positions_seed.json', projectRoot), 'utf8'));
  const published = JSON.parse(await readFile(new URL('public/data.json', projectRoot), 'utf8'));
  const registry = JSON.parse(await readFile(new URL('data/source_registry.json', projectRoot), 'utf8'));
  const sourceById = new Map(registry.map((source) => [source.sourceId, source]));
  const rows = seed.filter((row) => row.year === 2026 && row.sources.some((id) => id.startsWith('daxing-2026-')));

  assert.equal(rows.length, 12);
  assert.equal(new Set(rows.map((row) => row.code)).size, 12);
  assert.equal(rows.reduce((sum, row) => sum + row.recruitCount, 0), 18);
  assert.ok(rows.every((row) => row.title && row.education && row.majorText && row.eligibilityText));
  assert.ok(rows.every((row) => row.sourceLevel === 'secondary'));
  assert.ok(rows.every((row) => row.eligibilityComplete === false));
  assert.ok(rows.every((row) => row.sources.every((id) => sourceById.get(id)?.level === 'secondary')));
  assert.deepEqual(
    rows.filter((row) => row.crossVerified).map((row) => row.code).sort(),
    ['121566701', '121566703', '221565101', '221565102'],
    'only rows with matching fields in the independent xduim and direct-detail mirrors are cross-confirmed',
  );

  const xduimSource = sourceById.get('daxing-2026-xduim-page-1');
  assert.equal(xduimSource?.reportedPositionCount, 20);
  assert.equal(xduimSource?.reportedRecruitCount, 33);
  assert.equal(rows.filter((row) => row.sources.includes('daxing-2026-xduim-page-1')).length, 4,
    'only title-confirmed overlaps from the partial listing page are linked as position rows');

  const titleMissingCodes = [
    '121566702', '121566704', '121566705', '221565201', '221565203', '221565401', '221565501',
    '221565605', '221565701', '221565901', '221565902', '221565903', '221566001', '221566002',
    '221566301', '221566401',
  ];
  for (const code of titleMissingCodes) {
    assert.ok(!rows.some((row) => row.code === code), `${code} title must not be invented`);
  }

  assert.deepEqual(
    published.positions.find((row) => row.year === 2026 && row.code === '121566701')?.majorCriteria?.graduate,
    ['0301', '0351'],
  );
  const waterRole = rows.find((row) => row.code === '821565801');
  assert.match(waterRole.eligibilityText, /未提供完整资格条件.*官方职位表核验/);
});
