import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { normalizeDataset } from '../src/data/normalize.js';

test('2025 Beijing Jingkao registration snapshots stay attached to their position codes and snapshot ratios', async () => {
  const raw = JSON.parse(await readFile(new URL('../public/data.json', import.meta.url), 'utf8'));
  const dataset = normalizeDataset(raw);
  const sourceId = 'huatu-2025-citywide-top10-qualified';
  const expected = [
    ['220527701', 177, 1, 177],
    ['221155801', 117, 1, 117],
    ['241677103', 102, 1, 102],
    ['220633901', 193, 2, 96.5],
    ['231569502', 92, 1, 92],
    ['241052801', 81, 1, 81],
    ['221460602', 74, 1, 74],
    ['231570503', 73, 1, 73],
    ['231568202', 140, 2, 70],
    ['221156501', 137, 2, 68.5],
  ];

  const source = dataset.sources.find((item) => item.sourceId === sourceId);
  assert.equal(source?.level, 'secondary');
  assert.equal(source?.observedAt, '2024-11-21 09:00');
  assert.equal(source?.url, 'https://www.huatu.com/2024/1121/2789842.html');

  for (const [code, qualified, recruits, ratio] of expected) {
    const position = dataset.positions.find((item) => Number(item.year) === 2025 && item.code === code);
    assert.ok(position, `2025 position ${code} should exist in the position library`);
    const rows = dataset.observations.filter((item) => item.sourceId === sourceId
      && Number(item.year) === 2025 && item.positionCode === code);
    assert.equal(rows.length, 1, `position ${code} should have exactly one linked snapshot`);
    assert.equal(rows[0].scope, 'position-level');
    assert.equal(rows[0].observedAt, '2024-11-21 09:00');
    assert.equal(rows[0].applicantsQualified, qualified);
    assert.equal(rows[0].recruitCount, recruits);
    assert.equal(rows[0].qualifiedCompetitionRatio, ratio);
  }
});

test('2025 November 19 morning citywide leaderboard keeps named jobs and planned recruits aligned', async () => {
  const raw = JSON.parse(await readFile(new URL('../public/data.json', import.meta.url), 'utf8'));
  const dataset = normalizeDataset(raw);
  const sourceId = 'eoffcn-2025-citywide-top10-qualified-20241119-0900';
  const expected = [
    ['232501302', 221, 115],
    ['232501804', 107, 78],
    ['232502401', 82, 40],
    ['232501702', 79, 70],
    ['232501602', 63, 65],
    ['220527701', 45, 1],
    ['232502602', 43, 35],
    ['221156501', 39, 2],
    ['231568202', 39, 2],
  ];

  const source = dataset.sources.find((item) => item.sourceId === sourceId);
  assert.equal(source?.url, 'https://www.eoffcn.com/kszx/detail/1514988.html');
  assert.equal(source?.observedAt, '2024-11-19 09:00');

  for (const [code, qualified, recruits] of expected) {
    const position = dataset.positions.find((item) => item.year === 2025 && item.code === code);
    assert.equal(position?.recruitCount, recruits, `2025 position ${code} planned recruits`);
    const rows = dataset.observations.filter((item) => item.sourceId === sourceId
      && item.year === 2025 && item.positionCode === code);
    assert.equal(rows.length, 1, `position ${code} should have one morning snapshot`);
    assert.equal(rows[0].scope, 'position-level');
    assert.equal(rows[0].observedAt, '2024-11-19 09:00');
    assert.equal(rows[0].applicantsQualified, qualified);
    assert.equal(rows[0].recruitCount, recruits);
    assert.equal(rows[0].qualifiedCompetitionRatio, qualified / recruits);
    assert.equal(rows[0].applicantsRegistered, null);
    assert.equal(rows[0].applicantsPaid, null);
    assert.equal(rows[0].actualTestTakers, null);
  }
});

test('2025 November 20 morning citywide leaderboards attach only exact-code qualification snapshots', async () => {
  const raw = JSON.parse(await readFile(new URL('../public/data.json', import.meta.url), 'utf8'));
  const dataset = normalizeDataset(raw);
  const sourceId = 'eoffcn-2025-citywide-top10-qualified-20241120-0900';
  const expected = [
    ['232501302', 436, 115],
    ['232501902', 267, 77],
    ['232501804', 246, 78],
    ['232502401', 197, 40],
    ['232502702', 165, 35],
    ['232502002', 160, 52],
    ['232501702', 156, 70],
    ['232501602', 150, 65],
    ['242502301', 145, 44],
    ['242503001', 135, 30],
    ['220527701', 112, 1],
    ['241677103', 70, 1],
    ['220633901', 122, 2],
    ['221460602', 60, 1],
    ['231569502', 56, 1],
    ['221155801', 55, 1],
    ['231570503', 47, 1],
    ['820116908', 93, 2],
    ['231052403', 45, 1],
    ['231568202', 84, 2],
  ];

  const source = dataset.sources.find((item) => item.sourceId === sourceId);
  assert.equal(source?.year, 2025);
  assert.equal(source?.observedAt, '2024-11-20 09:00');
  assert.equal(source?.url, 'https://www.eoffcn.com/kszx/detail/1516653.html');
  assert.equal(source?.positionSnapshots.length, 21, '20 named jobs plus one citywide aggregate');
  const citywide = dataset.observations.find((item) => item.sourceId === sourceId
    && item.scope === 'citywide-level');
  assert.equal(citywide?.applicantsQualified, 10510);
  assert.equal(citywide?.recruitCount, 4487);
  assert.equal(citywide?.positionCode, null, 'the citywide total must not be attached to a job code');

  for (const [code, qualified, recruits] of expected) {
    const position = dataset.positions.find((item) => item.year === 2025 && item.code === code);
    assert.equal(position?.recruitCount, recruits, `2025 position ${code} planned recruits`);
    const rows = dataset.observations.filter((item) => item.sourceId === sourceId
      && item.year === 2025 && item.positionCode === code);
    assert.equal(rows.length, 1, `position ${code} should have one morning snapshot`);
    assert.equal(rows[0].scope, 'position-level');
    assert.equal(rows[0].observedAt, '2024-11-20 09:00');
    assert.equal(rows[0].applicantsQualified, qualified);
    assert.equal(rows[0].recruitCount, recruits);
    assert.equal(rows[0].qualifiedCompetitionRatio, qualified / recruits);
    assert.equal(rows[0].applicantsRegistered, null);
    assert.equal(rows[0].applicantsPaid, null);
    assert.equal(rows[0].actualTestTakers, null);
  }
});

test('2025 first-day Huatu competition highlights retain the early citywide and unique-match job snapshots', async () => {
  const raw = JSON.parse(await readFile(new URL('../public/data.json', import.meta.url), 'utf8'));
  const dataset = normalizeDataset(raw);
  const sourceId = 'huatu-2025-first-day-20241118-1800';
  const source = dataset.sources.find((item) => item.sourceId === sourceId);
  assert.equal(source?.year, 2025);
  assert.equal(source?.observedAt, '2024-11-18 18:00');
  assert.equal(source?.url, 'https://bj.huatu.com/2024/1118/1244540.html');

  const citywide = dataset.observations.find((item) => item.sourceId === sourceId
    && item.scope === 'citywide-level');
  assert.equal(citywide?.positionCode, null);
  assert.equal(citywide?.applicantsQualified, 2255);
  assert.equal(citywide?.recruitCount, 4487);

  for (const [code, qualified, recruits] of [
    ['220527701', 45, 1],
    ['221155801', 33, 1],
    ['221460602', 29, 1],
    ['232501804', 104, 78],
  ]) {
    const position = dataset.positions.find((item) => item.year === 2025 && item.code === code);
    assert.equal(position?.recruitCount, recruits, `2025 position ${code} planned recruits`);
    const rows = dataset.observations.filter((item) => item.sourceId === sourceId
      && item.year === 2025 && item.positionCode === code);
    assert.equal(rows.length, 1, `position ${code} should have one first-day snapshot`);
    assert.equal(rows[0].scope, 'position-level');
    assert.equal(rows[0].observedAt, '2024-11-18 18:00');
    assert.equal(rows[0].applicantsQualified, qualified);
    assert.equal(rows[0].recruitCount, recruits);
    assert.equal(rows[0].qualifiedCompetitionRatio, qualified / recruits);
  }
});

test('Shijingshan district competition snapshots stay separate from exact-code position snapshots', async () => {
  const raw = JSON.parse(await readFile(new URL('../public/data.json', import.meta.url), 'utf8'));
  const dataset = normalizeDataset(raw);
  const positionSnapshots = [
    ['eoffcn-2024-shijingshan-20231113-1800', 2024, '2023-11-13 18:00', '220840401', 13, 1],
    ['eoffcn-2024-shijingshan-20231114-0900', 2024, '2023-11-14 09:00', '220840401', 13, 1],
    ['eoffcn-2024-shijingshan-20231114-1800', 2024, '2023-11-14 18:00', '220840401', 32, 1],
    ['eoffcn-2024-shijingshan-police-20231116-1800', 2024, '2023-11-16 18:00', '232502402', 66, 25],
    ['eoffcn-2025-shijingshan-20241119-1800', 2025, '2024-11-19 18:00', '232502102', 0, 3],
  ];

  for (const [sourceId, year, observedAt, code, qualified, recruits] of positionSnapshots) {
    const rows = dataset.observations.filter((item) => item.sourceId === sourceId
      && item.year === year && item.positionCode === code);
    assert.equal(rows.length, 1, `${sourceId} should link one observation to position ${code}`);
    assert.equal(rows[0].scope, 'position-level');
    assert.equal(rows[0].observedAt, observedAt);
    assert.equal(rows[0].applicantsQualified, qualified);
    assert.equal(rows[0].recruitCount, recruits);
    assert.equal(rows[0].qualifiedCompetitionRatio, qualified / recruits);
  }

  const districtSnapshots = [
    ['eoffcn-2024-shijingshan-20231114-0900', '2023-11-14 09:00', 53, 130],
    ['eoffcn-2024-shijingshan-20231114-1800', '2023-11-14 18:00', 194, 130],
    ['eoffcn-2024-shijingshan-20231115-0900', '2023-11-15 09:00', 224, 130],
    ['eoffcn-2024-shijingshan-20231115-1800', '2023-11-15 18:00', 436, 130],
    ['eoffcn-2024-application-district-counts', '2023-11-16 09:00', 663, 130],
    ['eoffcn-2024-shijingshan-20231116-1800', '2023-11-16 18:00', 875, 130],
    ['eoffcn-2024-qualified', '2023-11-17 09:00', 1083, 130],
    ['eoffcn-2025-shijingshan-20241121-0900', '2024-11-21 09:00', 320, 125],
    ['eoffcn-2025-citywide-hot-jobs-20241122-0900', '2024-11-22 09:00', 1000, 125],
  ];

  for (const [sourceId, observedAt, qualified, recruits] of districtSnapshots) {
    const rows = dataset.observations.filter((item) => item.sourceId === sourceId
      && item.observedAt === observedAt && item.scope === 'district-level' && item.unit === '石景山区');
    assert.equal(rows.length, 1, `${sourceId} should contain one Shijingshan district snapshot`);
    assert.equal(rows[0].positionCode, null, 'district totals must not masquerade as a position observation');
    assert.equal(rows[0].applicantsQualified, qualified);
    assert.equal(rows[0].recruitCount, recruits);
    assert.equal(rows[0].qualifiedCompetitionRatio, qualified / recruits);
  }
});

test('2025 evening competition ratios link to the exact positions and preserve the later snapshot time', async () => {
  const raw = JSON.parse(await readFile(new URL('../public/data.json', import.meta.url), 'utf8'));
  const dataset = normalizeDataset(raw);
  const sourceId = 'huatu-2025-citywide-top3-evening-ratios';
  const expected = [
    ['220527701', 245, 1, 245],
    ['241677103', 157, 1, 157],
    ['221155801', 155, 1, 155],
  ];

  const source = dataset.sources.find((item) => item.sourceId === sourceId);
  assert.equal(source?.observedAt, '2024-11-21 18:00');
  assert.equal(source?.url, 'https://bj.huatu.com/2024/1122/1244624.html');

  for (const [code, qualified, recruits, ratio] of expected) {
    const position = dataset.positions.find((item) => Number(item.year) === 2025 && item.code === code);
    assert.equal(position?.recruitCount, recruits, `2025 position ${code} should retain its planned recruits`);
    const rows = dataset.observations.filter((item) => item.sourceId === sourceId
      && Number(item.year) === 2025 && item.positionCode === code);
    assert.equal(rows.length, 1, `position ${code} should have exactly one linked evening snapshot`);
    assert.equal(rows[0].observedAt, '2024-11-21 18:00');
    assert.equal(rows[0].applicantsQualified, qualified);
    assert.equal(rows[0].recruitCount, recruits);
    assert.equal(rows[0].qualifiedCompetitionRatio, ratio);
  }
});

test('2025 Tongzhou final-day snapshot links the Business Bureau post by its exact code', async () => {
  const raw = JSON.parse(await readFile(new URL('../public/data.json', import.meta.url), 'utf8'));
  const dataset = normalizeDataset(raw);
  const sourceId = 'eoffcn-2025-citywide-hot-jobs-20241122-0900';
  const source = dataset.sources.find((item) => item.sourceId === sourceId);
  const position = dataset.positions.find((item) => Number(item.year) === 2025 && item.code === '221155801');
  const rows = dataset.observations.filter((item) => item.sourceId === sourceId
    && Number(item.year) === 2025 && item.positionCode === '221155801');

  assert.equal(source?.observedAt, '2024-11-22 09:00');
  assert.equal(source?.url, 'https://www.eoffcn.com/kszx/detail/1521605.html');
  assert.equal(position?.unit, '北京市通州区商务局');
  assert.equal(position?.recruitCount, 1);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].scope, 'position-level');
  assert.equal(rows[0].applicantsQualified, 155);
  assert.equal(rows[0].recruitCount, 1);
  assert.equal(rows[0].qualifiedCompetitionRatio, 155);
});

test('2025 final-day citywide total is stored once alongside existing exact-code job snapshots', async () => {
  const raw = JSON.parse(await readFile(new URL('../public/data.json', import.meta.url), 'utf8'));
  const dataset = normalizeDataset(raw);
  const sourceId = 'eoffcn-2025-citywide-hot-jobs-20241122-0900';
  const source = dataset.sources.find((item) => item.sourceId === sourceId);
  assert.equal(source?.observedAt, '2024-11-22 09:00');
  assert.equal(source?.url, 'https://www.eoffcn.com/kszx/detail/1521605.html');
  assert.equal(source?.positionSnapshots.filter((item) => item.scope === 'position-level').length, 20);
  assert.equal(source?.positionSnapshots.filter((item) => item.scope === 'district-level').length, 16);
  assert.equal(source?.positionSnapshots.length, 38);

  const citywide = dataset.observations.filter((item) => item.sourceId === sourceId && item.scope === 'citywide-level');
  assert.equal(citywide.length, 1);
  assert.equal(citywide[0].applicantsQualified, 46546);
  assert.equal(citywide[0].recruitCount, 4487);
  const positions = dataset.observations.filter((item) => item.sourceId === sourceId && item.positionCode);
  assert.equal(positions.length, 20);
  assert.equal(new Set(positions.map((item) => item.positionCode)).size, 20);
});

test('2025 final-day registration snapshot includes all sixteen district aggregates without assigning job codes', async () => {
  const raw = JSON.parse(await readFile(new URL('../public/data.json', import.meta.url), 'utf8'));
  const dataset = normalizeDataset(raw);
  const sourceId = 'eoffcn-2025-citywide-hot-jobs-20241122-0900';
  const expected = [
    ['dongcheng', '东城区', 3693, 361], ['xicheng', '西城区', 4055, 447], ['chaoyang', '朝阳区', 4064, 403], ['haidian', '海淀区', 4095, 433],
    ['fengtai', '丰台区', 3452, 308], ['shijingshan', '石景山区', 1000, 125], ['mentougou', '门头沟区', 1285, 149], ['fangshan', '房山区', 2888, 244],
    ['tongzhou', '通州区', 2728, 212], ['shunyi', '顺义区', 2185, 181], ['changping', '昌平区', 1738, 176], ['daxing', '大兴区', 2121, 183],
    ['huairou', '怀柔区', 1307, 153], ['pinggu', '平谷区', 1267, 115], ['miyun', '密云区', 1762, 158], ['yanqing', '延庆区', 1449, 132],
  ];
  const rows = dataset.observations.filter((item) => item.sourceId === sourceId && item.scope === 'district-level');

  assert.equal(rows.length, 16);
  assert.deepEqual(rows.map((row) => [row.districtId, row.unit, row.applicantsQualified, row.recruitCount]).sort(), expected.sort());
  assert.equal(rows.reduce((sum, row) => sum + row.applicantsQualified, 0), 39089);
  assert.equal(rows.reduce((sum, row) => sum + row.recruitCount, 0), 3780);
  for (const row of rows) {
    assert.equal(row.positionCode, null, `${row.unit} is an aggregate, not a position-level observation`);
    assert.equal(row.observedAt, '2024-11-22 09:00');
    assert.equal(row.qualifiedCompetitionRatio, row.applicantsQualified / row.recruitCount);
  }
  const municipal = dataset.observations.filter((item) => item.sourceId === sourceId
    && item.scope === 'unit-level' && item.unit === '市直');
  assert.equal(municipal.length, 1);
  assert.equal(municipal[0].districtId, null);
  assert.equal(municipal[0].applicantsQualified, 7457);
  assert.equal(municipal[0].recruitCount, 707);
  assert.equal(municipal[0].qualifiedCompetitionRatio, 7457 / 707);
  assert.equal(rows.reduce((sum, row) => sum + row.applicantsQualified, 0) + municipal[0].applicantsQualified, 46546);
  assert.equal(rows.reduce((sum, row) => sum + row.recruitCount, 0) + municipal[0].recruitCount, 4487);
});

test('Xicheng district and exact-position qualification snapshots preserve their time, grain, and ratios', async () => {
  const raw = JSON.parse(await readFile(new URL('../public/data.json', import.meta.url), 'utf8'));
  const dataset = normalizeDataset(raw);
  const districtSnapshots = [
    ['eoffcn-2024-shijingshan-20231115-1800', '2023-11-15 18:00', 1971, 496],
    ['offcn-2024-xicheng-competition-20231116-1800', '2023-11-16 18:00', 4076, 496],
    ['eoffcn-2024-shijingshan-20231116-1800', '2023-11-16 18:00', 4076, 496],
    ['eoffcn-2024-qualified', '2023-11-17 09:00', 4669, 496],
    ['huatu-2025-xicheng-district-20241121-0900', '2024-11-21 09:00', 1771, 447],
    ['eoffcn-2025-citywide-hot-jobs-20241122-0900', '2024-11-22 09:00', 4055, 447],
  ];

  for (const [sourceId, observedAt, qualified, recruits] of districtSnapshots) {
    const source = dataset.sources.find((item) => item.sourceId === sourceId);
    const rows = dataset.observations.filter((item) => item.sourceId === sourceId
      && item.scope === 'district-level' && item.unit === '西城区');
    assert.equal(source?.observedAt, observedAt);
    assert.equal(rows.length, 1, `${sourceId} should have one Xicheng aggregate row`);
    assert.equal(rows[0].positionCode, null, 'district totals must not be assigned to a job code');
    assert.equal(rows[0].applicantsQualified, qualified);
    assert.equal(rows[0].recruitCount, recruits);
    assert.equal(rows[0].qualifiedCompetitionRatio, qualified / recruits);
  }

  const positionSnapshots = [
    [2024, 'eoffcn-2024-shijingshan-20231115-1800', '2023-11-15 18:00', '220219306', 74, 1],
    [2024, 'eoffcn-2024-shijingshan-20231116-1800', '2023-11-16 18:00', '220219306', 128, 1],
    [2024, 'offcn-2024-xicheng-competition-20231116-1800', '2023-11-16 18:00', '220219306', 127, 1],
    [2024, 'offcn-2024-xicheng-competition-20231116-1800', '2023-11-16 18:00', '220220102', 72, 1],
    [2024, 'eoffcn-2024-qualified', '2023-11-17 09:00', '220219306', 127, 1],
    [2025, 'huatu-2025-xicheng-selectivist-20241121-0900', '2024-11-21 09:00', '120220301', 62, 10],
    [2025, 'huatu-2025-xicheng-selectivist-20241121-0900', '2024-11-21 09:00', '120220302', 109, 8],
    [2025, 'huatu-2025-xicheng-selectivist-20241121-0900', '2024-11-21 09:00', '120220303', 74, 8],
    [2025, 'huatu-2025-xicheng-selectivist-20241121-0900', '2024-11-21 09:00', '120220304', 80, 8],
    [2025, 'huatu-2025-xicheng-selectivist-20241121-0900', '2024-11-21 09:00', '120220305', 137, 8],
    [2025, 'huatu-2025-xicheng-selectivist-20241121-0900', '2024-11-21 09:00', '120220306', 139, 8],
    [2025, 'eoffcn-2025-xicheng-selectivist-20241122-0900', '2024-11-22 09:00', '120220301', 124, 10],
    [2025, 'eoffcn-2025-xicheng-selectivist-20241122-0900', '2024-11-22 09:00', '120220302', 159, 8],
    [2025, 'eoffcn-2025-xicheng-selectivist-20241122-0900', '2024-11-22 09:00', '120220303', 125, 8],
    [2025, 'eoffcn-2025-xicheng-selectivist-20241122-0900', '2024-11-22 09:00', '120220304', 166, 8],
    [2025, 'eoffcn-2025-xicheng-selectivist-20241122-0900', '2024-11-22 09:00', '120220305', 219, 8],
    [2025, 'eoffcn-2025-xicheng-selectivist-20241122-0900', '2024-11-22 09:00', '120220306', 227, 8],
    [2025, 'eoffcn-2025-citywide-hot-jobs-20241122-0900', '2024-11-22 09:00', '820220601', 110, 1],
  ];

  for (const [year, sourceId, observedAt, code, qualified, recruits] of positionSnapshots) {
    const position = dataset.positions.find((item) => item.year === year && item.code === code);
    const row = dataset.observations.find((item) => item.year === year && item.sourceId === sourceId
      && item.positionCode === code && item.observedAt === observedAt);
    assert.equal(position?.districtId, 'xicheng', `${year} position ${code} should be in Xicheng`);
    assert.equal(position?.recruitCount, recruits);
    assert.equal(row?.scope, 'position-level');
    assert.equal(row?.applicantsQualified, qualified);
    assert.equal(row?.recruitCount, recruits);
    assert.equal(row?.qualifiedCompetitionRatio, qualified / recruits);
  }

  const sameTimeCultureRows = dataset.observations.filter((item) => item.year === 2024
    && item.observedAt === '2023-11-16 18:00' && item.positionCode === '220219306'
    && ['eoffcn-2024-shijingshan-20231116-1800', 'offcn-2024-xicheng-competition-20231116-1800'].includes(item.sourceId));
  assert.deepEqual(sameTimeCultureRows.map((item) => [item.sourceId, item.applicantsQualified]).sort(), [
    ['eoffcn-2024-shijingshan-20231116-1800', 128],
    ['offcn-2024-xicheng-competition-20231116-1800', 127],
  ].sort());

  const cutoffs = dataset.scoreRows.filter((item) => item.sourceId === 'cgzj-2026-xicheng-cutoff-sample');
  assert.equal(cutoffs.length, 28);
  assert.equal(cutoffs.filter((item) => item.mappingConfidence === 'high').length, 25);
  assert.equal(cutoffs.filter((item) => item.mappingConfidence === 'ambiguous').length, 2);
  assert.equal(cutoffs.filter((item) => item.mappingConfidence === 'unmatched').length, 1);
  assert.equal(Math.min(...cutoffs.map((item) => item.score)), 98);
  assert.equal(Math.max(...cutoffs.map((item) => item.score)), 140);
});

test('2025 day-two evening ratios preserve the earlier observation for the same exact position codes', async () => {
  const raw = JSON.parse(await readFile(new URL('../public/data.json', import.meta.url), 'utf8'));
  const dataset = normalizeDataset(raw);
  const sourceId = 'huatu-2025-citywide-top3-day2-evening-ratios';
  const expected = [
    ['220527701', 111],
    ['241677103', 70],
    ['221460602', 60],
  ];

  const source = dataset.sources.find((item) => item.sourceId === sourceId);
  assert.equal(source?.observedAt, '2024-11-19 18:00');
  assert.equal(source?.url, 'https://m.bj.huatu.com/2024/1120/1244583.html');

  for (const [code, qualified] of expected) {
    const position = dataset.positions.find((item) => Number(item.year) === 2025 && item.code === code);
    assert.equal(position?.recruitCount, 1, `2025 position ${code} should have one planned recruit`);
    const rows = dataset.observations.filter((item) => item.sourceId === sourceId
      && Number(item.year) === 2025 && item.positionCode === code);
    assert.equal(rows.length, 1, `position ${code} should have exactly one day-two evening snapshot`);
    assert.equal(rows[0].observedAt, '2024-11-19 18:00');
    assert.equal(rows[0].applicantsQualified, qualified);
    assert.equal(rows[0].recruitCount, 1);
    assert.equal(rows[0].qualifiedCompetitionRatio, qualified);
  }
});

test('2025 Huatu November 20 evening leaderboards retain 19 unique exact-code position snapshots', async () => {
  const raw = JSON.parse(await readFile(new URL('../public/data.json', import.meta.url), 'utf8'));
  const dataset = normalizeDataset(raw);
  const expectedBySource = {
    'huatu-2025-citywide-top10-qualified-20241120-1800': [
      ['232501302', 624, 115, '北京市公安局公安交通管理局', '一线执法岗'],
      ['232501804', 458, 78, '北京市公安局朝阳分局', '一线执法岗1'],
      ['232501902', 365, 77, '北京市公安局海淀分局', '一线执法岗1'],
      ['232501702', 290, 70, '北京市公安局西城分局', '一线执法岗'],
      ['242502301', 288, 44, '北京市公安局房山分局', '一线执法岗1'],
      ['232501602', 285, 65, '北京市公安局东城分局', '一线执法岗'],
      ['232502401', 251, 40, '北京市公安局通州分局', '一线执法岗'],
      ['232502002', 233, 52, '北京市公安局丰台分局', '一线执法岗1'],
      ['232502702', 212, 35, '北京市公安局大兴分局', '一线执法岗'],
      ['220633901', 193, 2, '北京市海淀区发展和改革委员会', '综合管理岗'],
    ],
    'huatu-2025-citywide-top10-competition-20241120-1800': [
      ['220527701', 177, 1, '北京市朝阳区数据局', '数据资源岗'],
      ['221155801', 117, 1, '北京市通州区商务局', '产业发展岗'],
      ['241677103', 102, 1, '北京市怀柔区九渡河镇', '综合管理岗'],
      ['231569502', 90, 1, '北京市大兴区庞各庄镇', '综合管理岗'],
      ['241052801', 81, 1, '北京市房山区窦店镇', '信息宣传岗'],
      ['221460602', 74, 1, '北京市顺义区园林绿化局', '综合管理岗'],
      ['231570503', 71, 1, '北京市大兴区瀛海镇', '综合管理岗'],
      ['231568202', 137, 2, '北京市大兴区市场监督管理局', '监督管理岗'],
      ['231052403', 68, 1, '北京市房山区城关街道', '综合管理岗'],
    ],
  };
  const codesAtTimestamp = [];

  for (const [sourceId, expected] of Object.entries(expectedBySource)) {
    const source = dataset.sources.find((item) => item.sourceId === sourceId);
    assert.equal(source?.level, 'secondary');
    assert.equal(source?.observedAt, '2024-11-20 18:00');
    const hasCitywideSummary = sourceId === 'huatu-2025-citywide-top10-qualified-20241120-1800';
    assert.equal(source?.positionSnapshots.length, expected.length + Number(hasCitywideSummary));

    if (hasCitywideSummary) {
      const citywide = dataset.observations.filter((item) => item.sourceId === sourceId && item.scope === 'citywide-level');
      assert.equal(citywide.length, 1);
      assert.equal(citywide[0].applicantsQualified, 19590);
      assert.equal(citywide[0].recruitCount, 4487);
      assert.equal(citywide[0].positionCode, null);
    }

    for (const [code, qualified, recruits, unit, title] of expected) {
      const position = dataset.positions.find((item) => Number(item.year) === 2025 && item.code === code);
      assert.equal(position?.unit, unit, `2025 position ${code} should match the reported unit`);
      assert.equal(position?.title, title, `2025 position ${code} should match the reported title`);
      assert.equal(position?.recruitCount, recruits, `2025 position ${code} should match its reported plan`);
      const rows = dataset.observations.filter((item) => item.sourceId === sourceId
        && Number(item.year) === 2025 && item.positionCode === code);
      assert.equal(rows.length, 1, `position ${code} should have one dated snapshot`);
      assert.equal(rows[0].observedAt, '2024-11-20 18:00');
      assert.equal(rows[0].applicantsQualified, qualified);
      assert.equal(rows[0].applicantsRegistered, null);
      assert.equal(rows[0].recruitCount, recruits);
      assert.equal(rows[0].qualifiedCompetitionRatio, qualified / recruits);
      codesAtTimestamp.push(code);
    }
  }

  assert.equal(new Set(codesAtTimestamp).size, 19, 'the overlapping Haidian job should be retained only once');
});

test('2026 citywide registration snapshots link dated qualified counts to matching position-year codes', async () => {
  const raw = JSON.parse(await readFile(new URL('../public/data.json', import.meta.url), 'utf8'));
  const dataset = normalizeDataset(raw);
  const snapshots = [
    {
      sourceId: 'eoffcn-2026-snapshot-20251117-1800',
      observedAt: '2025-11-17 18:00',
      expected: [
        ['232502102', 76, 32],
        ['232502501', 47, 30],
        ['242503001', 43, 15],
        ['241780601', 28, 1],
        ['232502801', 23, 10],
        ['220633601', 22, 2],
        ['220946301', 10, 1],
      ],
    },
    {
      sourceId: 'eoffcn-2026-snapshot-20251118-0900',
      observedAt: '2025-11-18 09:00',
      expected: [
        ['821261102', 131, 2],
        ['232502102', 76, 32],
        ['242503301', 51, 18],
        ['232502501', 47, 30],
        ['242503001', 43, 15],
        ['220633602', 29, 2],
        ['241780601', 28, 1],
        ['231052001', 26, 1],
        ['821263001', 22, 1],
        ['221262601', 18, 1],
        ['220946301', 18, 1],
      ],
    },
    {
      sourceId: 'eoffcn-2026-snapshot-20251118-1800',
      observedAt: '2025-11-18 18:00',
      expected: [
        ['821261102', 275, 2],
        ['232502501', 249, 30],
        ['232502102', 197, 32],
        ['242503001', 107, 15],
        ['821263001', 81, 1],
        ['221154902', 56, 1],
        ['220633601', 102, 2],
        ['241780601', 51, 1],
        ['220946301', 76, 1],
      ],
    },
    {
      sourceId: 'eoffcn-2026-snapshot-20251119-0900',
      observedAt: '2025-11-19 09:00',
      expected: [
        ['821261102', 275, 2],
        ['821263001', 95, 1],
        ['232502901', 187, 23],
        ['230531801', 71, 1],
        ['232502003', 183, 32],
        ['220946301', 77, 1],
        ['231156101', 123, 2],
        ['221154902', 56, 1],
        ['220633601', 106, 2],
        ['241780601', 51, 1],
      ],
    },
    {
      sourceId: 'eoffcn-2026-snapshot-20251119-1800',
      observedAt: '2025-11-19 18:00',
      expected: [
        ['821261102', 424, 2],
        ['232502501', 375, 30],
        ['232502102', 287, 32],
        ['220633601', 213, 2],
        ['232501901', 210, 30],
        ['232502201', 199, 22],
        ['821263001', 150, 1],
        ['221154902', 99, 1],
        ['231156101', 176, 2],
        ['241780601', 87, 1],
        ['220946301', 135, 1],
      ],
    },
  ];

  for (const { sourceId, observedAt, expected } of snapshots) {
    const source = dataset.sources.find((item) => item.sourceId === sourceId);
    assert.equal(source?.observedAt, observedAt, `${sourceId} should retain its exact snapshot time`);
    for (const [code, qualified, recruits] of expected) {
      const position = dataset.positions.find((item) => Number(item.year) === 2026 && item.code === code);
      assert.equal(position?.recruitCount, recruits, `2026 position ${code} should match the reported plan`);
      const rows = dataset.observations.filter((item) => item.sourceId === sourceId
        && Number(item.year) === 2026 && item.positionCode === code);
      assert.equal(rows.length, 1, `${sourceId} should have one row for position ${code}`);
      assert.equal(rows[0].scope, 'position-level');
      assert.equal(rows[0].observedAt, observedAt);
      assert.equal(rows[0].applicantsQualified, qualified);
      assert.equal(rows[0].recruitCount, recruits);
      assert.equal(rows[0].qualifiedCompetitionRatio, qualified / recruits);
    }
  }
});

test('the last available 2026 registration snapshots preserve the named hot post and citywide weighted totals', async () => {
  const raw = JSON.parse(await readFile(new URL('../public/data.json', import.meta.url), 'utf8'));
  const dataset = normalizeDataset(raw);
  const expected = [
    {
      sourceId: 'zhonggong-2026-snapshot-20251120-0900',
      observedAt: '2025-11-20 09:00',
      code: '821261102',
      qualified: 441,
      ratio: 220.5,
      citywideQualified: 23194,
    },
    {
      sourceId: 'sohu-2026-final-day-snapshot-20251121-0900',
      observedAt: '2025-11-21 09:00',
      code: '821261102',
      qualified: 615,
      ratio: 307.5,
      citywideQualified: 48026,
    },
  ];

  for (const snapshot of expected) {
    const source = dataset.sources.find((item) => item.sourceId === snapshot.sourceId);
    assert.equal(source?.observedAt, snapshot.observedAt);
    const position = dataset.positions.find((item) => item.year === 2026 && item.code === snapshot.code);
    assert.equal(position?.recruitCount, 2);
    const positionObservation = dataset.observations.find((item) => item.sourceId === snapshot.sourceId
      && item.positionCode === snapshot.code);
    assert.equal(positionObservation?.applicantsQualified, snapshot.qualified);
    assert.equal(positionObservation?.qualifiedCompetitionRatio, snapshot.ratio);

    const citywideObservation = dataset.observations.find((item) => item.sourceId === snapshot.sourceId
      && item.scope === 'citywide-level');
    assert.equal(citywideObservation?.positionCode, null);
    assert.equal(citywideObservation?.applicantsQualified, snapshot.citywideQualified);
    assert.equal(citywideObservation?.recruitCount, 3694);
    assert.equal(citywideObservation?.qualifiedCompetitionRatio, snapshot.citywideQualified / 3694);
  }
});

test('2026 Chaoyang position snapshots and interview cutoffs attach to exact year-and-code posts', async () => {
  const raw = JSON.parse(await readFile(new URL('../public/data.json', import.meta.url), 'utf8'));
  const dataset = normalizeDataset(raw);
  const expectedPositions = [
    ['230531801', '北京市朝阳区东坝地区（乡）', '平安建设岗', 1],
    ['232502003', '北京市公安局朝阳分局', '一线执法岗1', 32],
  ];

  for (const [code, unit, title, recruits] of expectedPositions) {
    const position = dataset.positions.find((item) => item.year === 2026 && item.code === code);
    assert.equal(position?.unit, unit);
    assert.equal(position?.title, title);
    assert.equal(position?.recruitCount, recruits);
  }

  const snapshots = [
    ['eoffcn-2026-snapshot-20251117-1800', '230531801', 22, 1, '2025-11-17 18:00'],
    ['eoffcn-2026-snapshot-20251117-1800', '232502003', 32, 32, '2025-11-17 18:00'],
    ['eoffcn-2026-snapshot-20251118-0900', '230531801', 22, 1, '2025-11-18 09:00'],
    ['eoffcn-2026-snapshot-20251118-0900', '232502003', 65, 32, '2025-11-18 09:00'],
    ['eoffcn-2026-snapshot-20251118-1800', '230531801', 69, 1, '2025-11-18 18:00'],
    ['eoffcn-2026-snapshot-20251118-1800', '232502003', 109, 32, '2025-11-18 18:00'],
    ['eoffcn-2026-snapshot-20251119-0900', '230531801', 71, 1, '2025-11-19 09:00'],
    ['eoffcn-2026-snapshot-20251119-0900', '232502003', 183, 32, '2025-11-19 09:00'],
    ['eoffcn-2026-snapshot-20251119-1800', '230531801', 124, 1, '2025-11-19 18:00'],
    ['eoffcn-2026-snapshot-20251119-1800', '232502003', 269, 32, '2025-11-19 18:00'],
  ];

  for (const [sourceId, code, qualified, recruits, observedAt] of snapshots) {
    const row = dataset.observations.find((item) => item.sourceId === sourceId
      && item.year === 2026 && item.positionCode === code);
    assert.equal(row?.applicantsQualified, qualified, `${sourceId} should retain ${code}'s exact qualified count`);
    assert.equal(row?.recruitCount, recruits);
    assert.equal(row?.observedAt, observedAt);
    assert.equal(row?.qualifiedCompetitionRatio, qualified / recruits);
  }

  const cutoffs = [
    ['230531801', 133.5],
    ['232502003', 56.35],
  ];
  for (const [code, score] of cutoffs) {
    const row = dataset.scoreRows.find((item) => item.year === 2026
      && item.positionCode === code && item.sourceId === 'cgzj-2026-chaoyang-cutoff-sample');
    assert.equal(row?.score, score);
    assert.equal(row?.mappingConfidence, 'high');
  }
});

test('2026 Daxing police qualification snapshots attach to the exact mirrored position code', async () => {
  const raw = JSON.parse(await readFile(new URL('../public/data.json', import.meta.url), 'utf8'));
  const dataset = normalizeDataset(raw);
  const position = dataset.positions.find((item) => item.year === 2026 && item.code === '232502901');
  const expected = [
    ['eoffcn-2026-snapshot-20251118-1800', '2025-11-18 18:00', 109, 23],
    ['eoffcn-2026-snapshot-20251119-0900', '2025-11-19 09:00', 187, 23],
    ['eoffcn-2026-snapshot-20251119-1800', '2025-11-19 18:00', 273, 23],
  ];

  assert.ok(position, 'the Daxing Public Security Bureau position should be in the position library');
  assert.equal(position.unit, '北京市公安局大兴分局');
  assert.equal(position.title, '一线执法岗');
  assert.equal(position.recruitCount, 23);
  assert.equal(position.workLocation, '北京 北京市 大兴区');
  for (const [sourceId, observedAt, qualified, recruits] of expected) {
    const row = dataset.observations.find((item) => item.sourceId === sourceId
      && item.year === 2026 && item.positionCode === '232502901');
    assert.equal(row?.applicantsQualified, qualified);
    assert.equal(row?.recruitCount, recruits);
    assert.equal(row?.observedAt, observedAt);
    assert.equal(row?.qualifiedCompetitionRatio, qualified / recruits);
  }
});

test('2026 Mentougou Civil Affairs snapshots attach to the exact mirrored position code', async () => {
  const raw = JSON.parse(await readFile(new URL('../public/data.json', import.meta.url), 'utf8'));
  const dataset = normalizeDataset(raw);
  const position = dataset.positions.find((item) => item.year === 2026 && item.code === '220946301');
  const source = dataset.sources.find((item) => item.sourceId === 'xduim-2026-mentougou-job-220946301');
  const expected = [
    ['eoffcn-2026-snapshot-20251117-1800', '2025-11-17 18:00', 10],
    ['eoffcn-2026-snapshot-20251118-0900', '2025-11-18 09:00', 18],
    ['eoffcn-2026-snapshot-20251118-1800', '2025-11-18 18:00', 76],
    ['eoffcn-2026-snapshot-20251119-0900', '2025-11-19 09:00', 77],
    ['eoffcn-2026-snapshot-20251119-1800', '2025-11-19 18:00', 135],
  ];

  assert.ok(position, 'Mentougou Civil Affairs position 220946301 should appear in the position library');
  assert.equal(position.unit, '北京市门头沟区民政局');
  assert.equal(position.title, '综合管理岗');
  assert.equal(position.recruitCount, 1);
  assert.equal(source?.url, 'https://www.xduim.com/zw/beijing/gwylist?city=%E9%97%A8%E5%A4%B4%E6%B2%9F%E5%8C%BA&year=2026');

  for (const [sourceId, observedAt, qualified] of expected) {
    const row = dataset.observations.find((item) => item.sourceId === sourceId
      && item.year === 2026 && item.positionCode === '220946301');
    assert.equal(row?.observedAt, observedAt);
    assert.equal(row?.applicantsQualified, qualified);
    assert.equal(row?.recruitCount, 1);
    assert.equal(row?.qualifiedCompetitionRatio, qualified);
  }
});

test('2026 Dongcheng police minimum interview score links to its unique year-and-code position', async () => {
  const raw = JSON.parse(await readFile(new URL('../public/data.json', import.meta.url), 'utf8'));
  const dataset = normalizeDataset(raw);
  const positionSource = dataset.sources.find((item) => item.sourceId === 'huatu-2026-dongcheng-232501801');
  const cutoffSource = dataset.sources.find((item) => item.sourceId === 'cgzj-2026-dongcheng-cutoff-sample');
  const expected = [
    ['232501801', '北京市公安局东城分局', '一线执法岗', 20, 55.9],
  ];

  assert.equal(positionSource?.url, 'https://ah.huatu.com/zw/bjgwy/dongcheng/2026_1.html');
  assert.equal(cutoffSource?.samplePositions, 26);
  assert.equal(cutoffSource?.minimum, 55.9);

  for (const [code, unit, title, recruits, score] of expected) {
    const matches = dataset.positions.filter((item) => item.year === 2026 && item.code === code);
    assert.equal(matches.length, 1, `${code} should identify exactly one 2026 position`);
    assert.equal(matches[0].districtId, 'dongcheng');
    assert.equal(matches[0].unit, unit);
    assert.equal(matches[0].title, title);
    assert.equal(matches[0].recruitCount, recruits);
    assert.ok(matches[0].sources.includes('huatu-2026-dongcheng-232501801'));

    const scoreRows = dataset.scoreRows.filter((item) => item.year === 2026
      && item.sourceId === 'cgzj-2026-dongcheng-cutoff-sample'
      && item.positionCode === code);
    assert.equal(scoreRows.length, 1, `${code} should have one linked cutoff row`);
    assert.equal(scoreRows[0].unit, unit);
    assert.equal(scoreRows[0].title, title);
    assert.equal(scoreRows[0].score, score);
    assert.equal(scoreRows[0].mappingConfidence, 'high');
  }
});

test('2026 Fengtai cutoff sample links every unique unit-and-title match to its position code', async () => {
  const raw = JSON.parse(await readFile(new URL('../public/data.json', import.meta.url), 'utf8'));
  const dataset = normalizeDataset(raw);
  const sourceId = 'cgzj-2026-fengtai-cutoff-sample';
  const expected = [
    ['823105805', '北京市规划和自然资源委员会丰台分局', '综合管理岗', 122],
    ['823105802', '北京市规划和自然资源委员会丰台分局', '不动产登记岗2', 120.5],
    ['823105803', '北京市规划和自然资源委员会丰台分局', '不动产登记岗3', 116.75],
    ['823105801', '北京市规划和自然资源委员会丰台分局', '不动产登记岗1', 114.75],
    ['223105804', '北京市规划和自然资源委员会丰台分局', '执法管理岗', 113.25],
    ['829908201', '北京市交通委员会丰台运输管理分局', '行业管理岗', 113],
    ['232502204', '北京市公安局丰台分局', '专业岗2', 60.85],
    ['232502203', '北京市公安局丰台分局', '专业岗1', 58.15],
  ];

  for (const [code, unit, title, score] of expected) {
    const positions = dataset.positions.filter((item) => item.year === 2026
      && item.unit === unit && item.title === title);
    assert.equal(positions.length, 1, `${unit}｜${title} should map to exactly one 2026 position`);
    assert.equal(positions[0].code, code);

    const scoreRows = dataset.scoreRows.filter((item) => item.year === 2026
      && item.sourceId === sourceId && item.positionCode === code);
    assert.equal(scoreRows.length, 1, `${code} should have one linked Fengtai cutoff sample`);
    assert.equal(scoreRows[0].unit, unit);
    assert.equal(scoreRows[0].title, title);
    assert.equal(scoreRows[0].score, score);
    assert.equal(scoreRows[0].mappingConfidence, 'high');
  }
});

test('2026 citywide traffic police qualification snapshot links to the exact municipal position', async () => {
  const raw = JSON.parse(await readFile(new URL('../public/data.json', import.meta.url), 'utf8'));
  const dataset = normalizeDataset(raw);
  const position = dataset.positions.find((item) => item.year === 2026 && item.code === '232501603');
  const source = dataset.sources.find((item) => item.sourceId === 'eoffcn-2026-snapshot-20251119-1800');
  const positionSource = dataset.sources.find((item) => item.sourceId === 'gwyzwb-2026-citywide-traffic-232501603');

  assert.ok(position, 'the municipal traffic police position should appear in the position library');
  assert.equal(position.unit, '北京市公安局公安交通管理局');
  assert.equal(position.title, '一线执法岗');
  assert.equal(position.recruitCount, 55);
  assert.equal(position.districtId, null, 'a citywide municipal post should not be assigned to a district');
  assert.ok(position.sources.includes('gwyzwb-2026-citywide-traffic-232501603'));
  assert.equal(positionSource?.url, 'https://bj.gwyzwb.com/2026/42.html');
  assert.equal(source?.observedAt, '2025-11-19 18:00');

  const observation = dataset.observations.find((item) => item.year === 2026
    && item.sourceId === 'eoffcn-2026-snapshot-20251119-1800'
    && item.positionCode === '232501603');
  assert.ok(observation, 'the reported qualification count should remain linked to the exact position code');
  assert.equal(observation.applicantsQualified, 714);
  assert.equal(observation.recruitCount, 55);
  assert.equal(observation.qualifiedCompetitionRatio, 714 / 55);
  assert.equal(observation.observedAt, '2025-11-19 18:00');
});

test('Dongcheng 2024 role-level competition history retains four dated qualification snapshots', async () => {
  const raw = JSON.parse(await readFile(new URL('../public/data.json', import.meta.url), 'utf8'));
  const dataset = normalizeDataset(raw);
  const expected = [
    ['eoffcn-2024-shijingshan-20231115-0900', '2023-11-15 09:00', 108, 2],
    ['eoffcn-2024-citywide-top10-20231116-0900', '2023-11-16 09:00', 186, 2],
    ['huatu-2024-citywide-top-jobs-20231116-1800', '2023-11-16 18:00', 256, 2],
    ['eoffcn-2024-qualified', '2023-11-17 09:00', 274, 2],
  ];

  for (const [sourceId, observedAt, qualified, recruits] of expected) {
    const rows = dataset.observations.filter((item) => item.year === 2024
      && item.positionCode === '230116901'
      && item.sourceId === sourceId
      && item.observedAt === observedAt);
    assert.equal(rows.length, 1, `${sourceId} should retain the exact Dongcheng position snapshot`);
    assert.equal(rows[0].scope, 'position-level');
    assert.equal(rows[0].applicantsQualified, qualified);
    assert.equal(rows[0].recruitCount, recruits);
    assert.equal(rows[0].qualifiedCompetitionRatio, qualified / recruits);
  }
});

test('2024 November 16 evening leaderboard attaches only uniquely available year-code positions', async () => {
  const raw = JSON.parse(await readFile(new URL('../public/data.json', import.meta.url), 'utf8'));
  const dataset = normalizeDataset(raw);
  const sourceId = 'huatu-2024-citywide-top-jobs-20231116-1800';
  const expected = [
    ['230527501', 438, 2],
    ['232502203', 435, 112],
    ['230116901', 256, 2],
    ['232502702', 245, 34],
    ['232502902', 239, 49],
    ['240943601', 152, 1],
    ['220219306', 128, 1],
    ['221452802', 111, 1],
    ['819900501', 109, 1],
    ['119900203', 105, 1],
    ['231454501', 90, 1],
    ['240944202', 85, 1],
  ];

  const source = dataset.sources.find((item) => item.sourceId === sourceId);
  assert.equal(source?.url, 'https://www.huatu.com/2023/1117/2703894.html');
  assert.equal(source?.observedAt, '2023-11-16 18:00');
  assert.equal(source?.positionSnapshots.length, 12, 'include every exact-code match from both top-ten tables');

  for (const [code, qualified, recruits] of expected) {
    const positions = dataset.positions.filter((item) => item.year === 2024 && item.code === code);
    assert.equal(positions.length, 1, `2024 position ${code} should be uniquely identifiable`);
    assert.equal(positions[0].recruitCount, recruits);
    const rows = dataset.observations.filter((item) => item.sourceId === sourceId
      && item.year === 2024 && item.positionCode === code);
    assert.equal(rows.length, 1, `position ${code} should have one 18:00 snapshot`);
    assert.equal(rows[0].scope, 'position-level');
    assert.equal(rows[0].observedAt, '2023-11-16 18:00');
    assert.equal(rows[0].applicantsQualified, qualified);
    assert.equal(rows[0].recruitCount, recruits);
    assert.equal(rows[0].qualifiedCompetitionRatio, qualified / recruits);
  }
});

test('2024 and 2025 citywide hot-post snapshots stay linked to same-year positions and exact counts', async () => {
  const raw = JSON.parse(await readFile(new URL('../public/data.json', import.meta.url), 'utf8'));
  const dataset = normalizeDataset(raw);
  const snapshots = [
    {
      sourceId: 'eoffcn-2024-citywide-top10-20231116-0900',
      year: 2024,
      observedAt: '2023-11-16 09:00',
      url: 'https://www.eoffcn.com/kszx/detail/1236208.html',
      expected: [
        ['230527501', 307, 2],
        ['240943601', 107, 1],
        ['230116901', 186, 2],
        ['220219306', 75, 1],
        ['819900501', 72, 1],
        ['221452802', 65, 1],
        ['240944202', 59, 1],
        ['221363901', 59, 1],
        ['231454501', 57, 1],
        ['119900203', 56, 1],
      ],
    },
    {
      sourceId: 'eoffcn-2025-citywide-top10-competition-20241121-1800',
      year: 2025,
      observedAt: '2024-11-21 18:00',
      url: 'https://www.eoffcn.com/kszx/detail/1517971.html',
      expected: [
        ['220527701', 245, 1],
        ['241677103', 157, 1],
        ['221155801', 155, 1],
        ['220633901', 280, 2],
        ['231569502', 132, 1],
        ['230118902', 115, 1],
        ['221460602', 113, 1],
        ['241052801', 102, 1],
        ['231570503', 102, 1],
        ['820528901', 101, 1],
      ],
    },
    {
      sourceId: 'eoffcn-2025-citywide-hot-jobs-20241122-0900',
      year: 2025,
      observedAt: '2024-11-22 09:00',
      url: 'https://www.eoffcn.com/kszx/detail/1521605.html',
      expected: [
        ['232501302', 1272, 115],
        ['232501804', 744, 78],
        ['232501702', 650, 70],
        ['232501902', 605, 77],
        ['232501602', 544, 65],
        ['242502301', 536, 44],
        ['232502002', 496, 52],
        ['232502401', 403, 40],
        ['242503001', 337, 30],
        ['232502702', 332, 35],
        ['220527701', 256, 1],
        ['241677103', 161, 1],
        ['221155801', 155, 1],
        ['220633901', 304, 2],
        ['230118902', 143, 1],
        ['231569502', 133, 1],
        ['820116908', 233, 2],
        ['820528901', 116, 1],
        ['221460602', 113, 1],
        ['820220601', 110, 1],
      ],
    },
  ];

  for (const { sourceId, year, observedAt, url, expected } of snapshots) {
    const source = dataset.sources.find((item) => item.sourceId === sourceId);
    assert.equal(source?.observedAt, observedAt, `${sourceId} should retain its exact snapshot time`);
    assert.equal(source?.url, url);
    for (const [code, qualified, recruits] of expected) {
      const position = dataset.positions.find((item) => item.year === year && item.code === code);
      assert.ok(position, `${year} position ${code} should exist in the position library`);
      assert.equal(position.recruitCount, recruits, `${year} position ${code} should retain the reported plan`);
      const rows = dataset.observations.filter((item) => item.sourceId === sourceId
        && item.year === year && item.positionCode === code);
      assert.equal(rows.length, 1, `${sourceId} should have one linked snapshot for ${code}`);
      assert.equal(rows[0].scope, 'position-level');
      assert.equal(rows[0].observedAt, observedAt);
      assert.equal(rows[0].applicantsQualified, qualified);
      assert.equal(rows[0].recruitCount, recruits);
      assert.equal(rows[0].qualifiedCompetitionRatio, qualified / recruits);
    }
  }
});

test('2026 November 20 evening snapshot keeps the citywide total and leaves an ambiguous job ratio unlinked', async () => {
  const raw = JSON.parse(await readFile(new URL('../public/data.json', import.meta.url), 'utf8'));
  const dataset = normalizeDataset(raw);
  const sourceId = 'sohu-2026-snapshot-20251120-1800';
  const source = dataset.sources.find((item) => item.sourceId === sourceId);

  assert.equal(source?.observedAt, '2025-11-20 18:00');
  assert.equal(source?.url, 'https://www.sohu.com/a/956654507_121124036');

  const archivePositions = dataset.positions.filter((item) => item.year === 2026
    && item.unit === '北京市昌平区档案馆');
  assert.deepEqual(archivePositions.map((item) => item.code).sort(), ['821261101', '821261102']);
  assert.equal(dataset.observations.some((item) => item.year === 2026
    && item.sourceId === sourceId && item.positionCode), false,
  'the report names the unit but cannot identify which of its two positions owns the ratio');
  assert.match(source?.notes || '', /288\.5/);
  assert.match(source?.notes || '', /821261101.*821261102/);
  assert.match(source?.notes || '', /未导入岗位级记录|无法.*关联/);

  const citywide = dataset.observations.find((item) => item.year === 2026
    && item.sourceId === sourceId && item.scope === 'citywide-level');
  assert.ok(citywide, 'the reported citywide qualified total should remain separate from position-level data');
  assert.equal(citywide.positionCode, null);
  assert.equal(citywide.applicantsQualified, 41477);
  assert.equal(citywide.recruitCount, 3694);
  assert.equal(citywide.qualifiedCompetitionRatio, 41477 / 3694);
});
