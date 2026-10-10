import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const projectRoot = new URL('../', import.meta.url);

test('2025 Huairou mirror rows reconcile to the district index and retain row-level provenance', async () => {
  const seed = JSON.parse(await readFile(new URL('data/positions_seed.json', projectRoot), 'utf8'));
  const published = JSON.parse(await readFile(new URL('public/data.json', projectRoot), 'utf8'));
  const sources = JSON.parse(await readFile(new URL('data/source_registry.json', projectRoot), 'utf8'));
  const sourceById = new Map(sources.map((source) => [source.sourceId, source]));
  const rows = seed.filter((row) => row.year === 2025
    && row.sources.some((sourceId) => sourceId.startsWith('huairou-2025-gwy-page-')));

  assert.equal(rows.length, 85);
  assert.equal(new Set(rows.map((row) => row.code)).size, 85);
  assert.equal(rows.reduce((sum, row) => sum + row.recruitCount, 0), 153);
  assert.ok(rows.every((row) => row.code && row.unit && row.title && row.education && row.majorText));
  assert.ok(rows.every((row) => row.sourceLevel === 'secondary' && row.crossVerified === false));
  assert.ok(rows.every((row) => row.eligibilityComplete === false));

  for (const row of rows) {
    const rowSources = row.sources.map((sourceId) => sourceById.get(sourceId));
    assert.ok(rowSources.every((source) => source?.level === 'secondary'), `${row.code} sources remain secondary`);
    assert.ok(rowSources.some((source) => source?.url), `${row.code} has a linked source URL`);
  }

  const detailSources = sources.filter((source) => source.sourceId.startsWith('huairou-2025-gwy-page-'));
  assert.equal(detailSources.length, 46, 'all 46 unit detail pages are registered');
  for (const source of detailSources) {
    const linked = rows.filter((row) => row.sources.includes(source.sourceId));
    assert.equal(linked.length, source.reportedPositionCount, source.sourceId);
    assert.equal(linked.reduce((sum, row) => sum + row.recruitCount, 0), source.reportedRecruitCount, source.sourceId);
  }

  const index = sourceById.get('huairou-2025-gwy-index');
  assert.equal(index?.reportedPositionCount, 85);
  assert.equal(index?.reportedRecruitCount, 153);

  const districtRows = published.positions.filter((row) => row.districtId === 'huairou' && row.year === 2025);
  assert.equal(districtRows.length, 85);
  assert.equal(districtRows.reduce((sum, row) => sum + row.recruitCount, 0), 153);
  assert.equal(published.positions.find((row) => row.year === 2025 && row.code === '242502801')?.districtId, 'huairou');
  assert.deepEqual(
    published.positions.find((row) => row.year === 2025 && row.code === '242502801')?.majorCriteria,
    {
      undergraduate: ['081802', '080902', '080903', '080904K', '080910T', '080911TK', '120203K', '080705'],
      graduate: ['0823', '120201', '1253', '0809', '0810', '0811', '0812', '0835', '0839'],
    },
  );
});

test('2026 Huairou mirror rows remain partial, expose recovered conditions, and retain the directory gap', async () => {
  const seed = JSON.parse(await readFile(new URL('data/positions_seed.json', projectRoot), 'utf8'));
  const published = JSON.parse(await readFile(new URL('public/data.json', projectRoot), 'utf8'));
  const sources = JSON.parse(await readFile(new URL('data/source_registry.json', projectRoot), 'utf8'));
  const sourceById = new Map(sources.map((source) => [source.sourceId, source]));
  const rows = seed.filter((row) => row.year === 2026
    && row.sources.some((sourceId) => sourceId.startsWith('huairou-2026-page-')));

  assert.equal(rows.length, 41);
  assert.equal(new Set(rows.map((row) => row.code)).size, 41);
  assert.equal(rows.reduce((sum, row) => sum + row.recruitCount, 0), 108);
  assert.ok(rows.every((row) => row.code && row.unit && row.title && row.education && row.majorText));
  assert.ok(rows.every((row) => row.sourceLevel === 'secondary' && row.crossVerified === false));
  assert.ok(rows.every((row) => row.eligibilityComplete === false));

  const detailSources = sources.filter((source) => source.sourceId.startsWith('huairou-2026-page-'));
  assert.equal(detailSources.length, 28);
  for (const source of detailSources) {
    const linked = rows.filter((row) => row.sources.includes(source.sourceId));
    assert.equal(linked.length, source.reportedPositionCount, source.sourceId);
    assert.equal(linked.reduce((sum, row) => sum + row.recruitCount, 0), source.reportedRecruitCount, source.sourceId);
  }

  const directory = sourceById.get('huairou-2026-gwy-index');
  assert.equal(directory?.reportedPositionCount, 44);
  assert.equal(directory?.reportedRecruitCount, 112);
  assert.ok(rows.length < directory.reportedPositionCount, 'do not present the partial detail set as full coverage');

  const publishedRows = published.positions.filter((row) => row.year === 2026 && row.districtId === 'huairou');
  assert.equal(publishedRows.length, 41);
  assert.equal(publishedRows.reduce((sum, row) => sum + row.recruitCount, 0), 108);
  const detailedJob = publishedRows.find((row) => row.code === '221672401');
  assert.equal(detailedJob?.department, '卫生健康监督所');
  assert.equal(detailedJob?.degreeRequirement, '与最高学历相对应的学位');
  assert.equal(detailedJob?.politicalStatus, '不限');
  assert.equal(detailedJob?.otherConditions, '按照男女比例1:1招录。；基层工作经历最低年限：无限制');
  assert.equal(detailedJob?.professionalTest, true);
  assert.equal(detailedJob?.physicalTest, true);
  assert.deepEqual(detailedJob?.majorCriteria?.graduate, ['0301', '0351', '0815', '0859', '1002', '1004', '1005', '1006', '1011', '1053', '1054', '1057', '1058', '1051']);
});
