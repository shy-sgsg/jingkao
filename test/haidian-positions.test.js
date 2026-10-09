import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const projectRoot = new URL('../', import.meta.url);
const haidianPrefix = 'haidian-2026-';
const mirrorCoverage = [
  { year: 2025, prefix: 'haidian-2025-gwy-page-', positions: 154, recruits: 434 },
];

test('2026 Haidian rows reconcile to detail sources without assigning unsupported units', async () => {
  const seed = JSON.parse(await readFile(new URL('data/positions_seed.json', projectRoot), 'utf8'));
  const published = JSON.parse(await readFile(new URL('public/data.json', projectRoot), 'utf8'));
  const registry = JSON.parse(await readFile(new URL('data/source_registry.json', projectRoot), 'utf8'));
  const rows = seed.filter((row) => row.year === 2026
    && row.sources.some((sourceId) => sourceId.startsWith(haidianPrefix)));
  const districtRows = published.positions.filter((row) => row.year === 2026
    && row.districtId === 'haidian'
    && row.sources.some((sourceId) => sourceId.startsWith(haidianPrefix)));

  assert.equal(rows.length, 150, 'include the 149 district-index rows and the separately unassigned city-unit candidate');
  assert.equal(new Set(rows.map((row) => row.code)).size, 150);
  assert.equal(districtRows.length, 149);
  assert.equal(districtRows.reduce((sum, row) => sum + row.recruitCount, 0), 349);
  assert.ok(districtRows.every((row) => row.unit.includes('海淀')));
  assert.ok(rows.every((row) => row.eligibilityComplete === false));
  assert.ok(rows.every((row) => row.crossVerified === false));
  assert.ok(rows.every((row) => row.sourceLevel === 'secondary'));
  assert.ok(rows.every((row) => row.title && row.education && row.majorText));

  const sourceById = new Map(registry.map((source) => [source.sourceId, source]));
  for (const row of rows) {
    assert.ok(row.sources.length > 0, `${row.code} needs source provenance`);
    assert.ok(row.sources.every((sourceId) => sourceById.get(sourceId)?.level === 'secondary'), `${row.code} must stay secondary`);
    assert.match(row.eligibilityText, /其他资格条件.*官方职位表核验/);
  }

  const fenbiRows = rows.filter((row) => row.sources.some((sourceId) => sourceId.startsWith(`${haidianPrefix}fenbi-page-`)));
  assert.equal(fenbiRows.length, 142);
  assert.equal(fenbiRows.reduce((sum, row) => sum + row.recruitCount, 0), 295);
  assert.ok(fenbiRows.every((row) => row.workLocation === '北京 北京市 海淀区'));

  for (const source of registry.filter((item) => item.sourceId.startsWith(`${haidianPrefix}fenbi-page-`))) {
    const linked = fenbiRows.filter((row) => row.sources.includes(source.sourceId));
    assert.equal(linked.length, source.reportedPositionCount, source.sourceId);
    assert.equal(linked.reduce((sum, row) => sum + row.recruitCount, 0), source.reportedRecruitCount, source.sourceId);
  }

  const expectedRows = new Map([
    ['232502102', ['北京市公安局海淀分局', '一线执法岗1', 32]],
    ['823105701', ['北京市规划和自然资源委员会海淀分局', '不动产登记岗', 1]],
    ['829908101', ['北京市交通委员会海淀运输管理分局', '安全应急岗', 1]],
    ['120632601', ['中共北京市海淀区委办公室', '综合管理岗', 1]],
    ['220635601', ['北京市海淀区信访办公室', '综合管理岗', 1]],
    ['230638001', ['北京市海淀区上地街道', '综合执法岗1', 2]],
  ]);
  for (const [code, [unit, title, recruits]] of expectedRows) {
    const row = rows.find((item) => item.code === code);
    assert.ok(row, `${code} should be imported`);
    assert.equal(row.unit.split('>')[0], unit, `${code} unit`);
    assert.equal(row.title, title, `${code} title`);
    assert.equal(row.recruitCount, recruits, `${code} recruits`);
  }

  const cityUnitCandidate = published.positions.find((row) => row.year === 2026 && row.code === '819909904');
  assert.equal(cityUnitCandidate?.districtId, null, 'a city-level unit name must not be assigned from work location alone');
  assert.equal(cityUnitCandidate?.workLocation, '北京 北京市 海淀区');
});

test('2025 Haidian detail rows reconcile to secondary area totals', async () => {
  const seed = JSON.parse(await readFile(new URL('data/positions_seed.json', projectRoot), 'utf8'));
  const registry = JSON.parse(await readFile(new URL('data/source_registry.json', projectRoot), 'utf8'));
  const sourceById = new Map(registry.map((source) => [source.sourceId, source]));

  for (const expected of mirrorCoverage) {
    const rows = seed.filter((row) => row.year === expected.year
      && row.sources.some((sourceId) => sourceId.startsWith(expected.prefix)));
    const uniqueCodes = new Set(rows.map((row) => row.code));

    assert.equal(rows.length, expected.positions, `${expected.year} detail row count (secondary total cross-check)`);
    assert.equal(uniqueCodes.size, expected.positions, `${expected.year} codes must be unique`);
    assert.equal(rows.reduce((sum, row) => sum + row.recruitCount, 0), expected.recruits, `${expected.year} recruit total`);
    assert.ok(rows.every((row) => row.sourceLevel === 'secondary' && row.crossVerified === false));
    assert.ok(rows.every((row) => row.eligibilityComplete === false));
    assert.ok(rows.every((row) => row.education && row.majorText && row.eligibilityText));

    for (const row of rows) {
      const pageSources = row.sources.filter((sourceId) => sourceId.startsWith(expected.prefix));
      assert.ok(pageSources.length > 0, `${row.code} needs a page-level source`);
      assert.ok(pageSources.every((sourceId) => sourceById.get(sourceId)?.level === 'secondary'), `${row.code} remains a mirror row`);
      assert.match(row.eligibilityText, /其他资格条件.*官方职位表核验/);
    }

    const detailSources = registry.filter((source) => source.sourceId.startsWith(expected.prefix));
    assert.ok(detailSources.length > 0, `${expected.year} needs registered detail pages`);
    for (const source of detailSources) {
      const linked = rows.filter((row) => row.sources.includes(source.sourceId));
      assert.equal(linked.length, source.reportedPositionCount, `${source.sourceId} position count`);
      assert.equal(linked.reduce((sum, row) => sum + row.recruitCount, 0), source.reportedRecruitCount, `${source.sourceId} recruit count`);
    }
  }
});

test('2024 Haidian imports only traceable detail rows and retains conflicting area totals', async () => {
  const seed = JSON.parse(await readFile(new URL('data/positions_seed.json', projectRoot), 'utf8'));
  const published = JSON.parse(await readFile(new URL('public/data.json', projectRoot), 'utf8'));
  const registry = JSON.parse(await readFile(new URL('data/source_registry.json', projectRoot), 'utf8'));
  const rows = seed.filter((row) => row.year === 2024
    && row.sources.some((sourceId) => sourceId.startsWith('haidian-2024-')));
  const expectedCodes = [
    '120630101', '120631801', '120631802', '120631803',
    '220630301', '220630302', '220630303', '220630401', '220630402', '220630501', '220630502',
    '220630601', '220630701', '220630702', '220630801', '220631001', '220631101', '220631201',
    '220631202', '220631401', '230630602', '230630603', '230630901', '230630902', '230630903',
    '230632101', '230632201', '230632202', '230632203', '230632301', '230632302', '230632303',
    '230632401', '230632402', '230632501', '230632502', '230632601', '230632701', '230632801',
    '230632802', '230632803', '230632901', '230633001', '230633002', '230633003', '230633101',
    '230633102', '230633201', '230633202', '230633301', '230633401', '230633402', '230633501',
    '230633601', '230633602', '230633701', '230633702', '230633703', '230633801', '230633802',
    '230633901', '230633902', '230634001', '230634002', '230634101', '230634201', '230634202',
    '230634203', '230634301', '230634302', '230634401', '230634402', '230634403', '230634501',
    '230634502', '230634503', '230634601', '230634602', '230634603', '232502201', '232502202',
    '232502203', '526010501', '526010502', '526010503', '625012501', '625012502', '625012503',
    '820630201', '820631501', '820631601', '820631701', '820631901', '820632001', '820632002',
    '823105301', '829908106', '830630403', '830631301', '830631302',
  ];
  assert.equal(expectedCodes.length, 100);
  assert.deepEqual(rows.map((row) => row.code).sort(), expectedCodes.sort());
  assert.equal(new Set(rows.map((row) => row.code)).size, 100);
  assert.equal(rows.reduce((sum, row) => sum + row.recruitCount, 0), 341);
  assert.ok(rows.every((row) => row.sourceLevel === 'secondary' && row.crossVerified === false));
  assert.ok(rows.every((row) => row.eligibilityComplete === false));
  assert.ok(rows.every((row) => row.education && row.majorText && row.eligibilityText));

  const sourceById = new Map(registry.map((source) => [source.sourceId, source]));
  for (const row of rows) {
    const pageSources = row.sources.filter((sourceId) => sourceId.startsWith('haidian-2024-'));
    assert.ok(pageSources.length > 0, `${row.code} needs a page-level source`);
    assert.ok(pageSources.every((sourceId) => sourceById.get(sourceId)?.level === 'secondary'), `${row.code} remains a mirror row`);
    assert.match(row.eligibilityText, /官方职位表核验/);
  }

  for (const source of registry.filter((item) => item.sourceId.startsWith('haidian-2024-'))) {
    const linked = rows.filter((row) => row.sources.includes(source.sourceId));
    assert.equal(linked.length, source.reportedPositionCount, `${source.sourceId} position count`);
    assert.equal(linked.reduce((sum, row) => sum + row.recruitCount, 0), source.reportedRecruitCount, `${source.sourceId} recruit count`);
  }

  assert.match(rows.find((row) => row.code === '230630903').eligibilityText, /两年（含两年）以上市场监管相关工作经历/);
  assert.match(rows.find((row) => row.code === '220630501').eligibilityText, /中共党员/);
  assert.match(rows.find((row) => row.code === '220630502').eligibilityText, /初级及以上会计职称资格证书/);

  const haidianRows = published.positions.filter((row) => row.year === 2024
    && row.districtId === 'haidian'
    && row.sources.some((sourceId) => sourceId.startsWith('haidian-2024-')));
  assert.equal(haidianRows.length, 99, 'do not assign the city-level Statistics Bureau row from the area index alone');
  assert.equal(haidianRows.reduce((sum, row) => sum + row.recruitCount, 0), 340);
  assert.equal(published.positions.find((row) => row.year === 2024 && row.code === '829908106')?.districtId, null);

  const expectedSummaries = new Map([
    ['gwyzwb-2024-haidian-summary', [95, 213]],
    ['huatu-2024-haidian-summary', [100, 341]],
    ['eoffcn-2024-haidian-summary', [99, 340]],
  ]);
  for (const [sourceId, [positions, recruits]] of expectedSummaries) {
    const source = sourceById.get(sourceId);
    assert.ok(source, `${sourceId} must stay traceable`);
    assert.equal(source.reportedPositionCount, positions);
    assert.equal(source.reportedRecruitCount, recruits);
    assert.equal(source.level, 'secondary');
  }
});
