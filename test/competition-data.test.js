import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { normalizeDataset } from '../src/data/normalize.js';
import { filterAndSortPositions, getPositionCompetitionEvidence } from '../src/data/positions.js';

test('2024 November 15 evening Dongcheng snapshot stays attached to Dongsi Street position', async () => {
  const raw = JSON.parse(await readFile(new URL('../public/data.json', import.meta.url), 'utf8'));
  const dataset = normalizeDataset(raw);
  const code = '230116901';
  const sourceId = 'eoffcn-2024-shijingshan-20231115-1800';
  const position = dataset.positions.find((item) => Number(item.year) === 2024 && item.code === code);
  const source = dataset.sources.find((item) => item.sourceId === sourceId);
  const row = dataset.observations.find((item) => item.sourceId === sourceId
    && Number(item.year) === 2024 && item.positionCode === code);

  assert.equal(source?.url, 'https://www.eoffcn.com/kszx/detail/1236079.html');
  assert.equal(source?.observedAt, '2023-11-15 18:00');
  assert.equal(position?.unit, '北京市东城区东四街道');
  assert.equal(position?.title, '综合管理岗');
  assert.equal(position?.recruitCount, 2);
  assert.equal(row?.scope, 'position-level');
  assert.equal(row?.applicantsQualified, 170);
  assert.equal(row?.recruitCount, 2);
  assert.equal(row?.qualifiedCompetitionRatio, 85);
  assert.equal(row?.applicantsRegistered, null);
  assert.equal(row?.applicantsPaid, null);
  assert.equal(row?.actualTestTakers, null);

  const competition = getPositionCompetitionEvidence(position, dataset);
  assert.deepEqual(competition.snapshots.map((snapshot) => snapshot.observedAt), [
    '2023-11-15 09:00',
    '2023-11-15 18:00',
    '2023-11-16 09:00',
    '2023-11-16 18:00',
    '2023-11-17 09:00',
  ]);
  assert.equal(competition.snapshots.find((snapshot) => snapshot.observedAt === '2023-11-15 18:00')?.qualifiedCompetitionRatio, 85);
  assert.equal(competition.qualifiedCompetitionRatio, 137);
});

test('2024 November 15 evening published position codes map only to exact local positions', async () => {
  const raw = JSON.parse(await readFile(new URL('../public/data.json', import.meta.url), 'utf8'));
  const dataset = normalizeDataset(raw);
  const sourceId = 'eoffcn-2024-shijingshan-20231115-1800';
  const expected = [
    ['220219306', 74, 1],
    ['230527501', 307, 2],
    ['232502203', 286, 112],
    ['232502702', 157, 34],
    ['242502602', 156, 44],
    ['240943601', 76, 1],
    ['819900501', 69, 1],
    ['221452802', 65, 1],
    ['221363901', 60, 1],
    ['231454501', 57, 1],
    ['119900203', 56, 1],
  ];

  for (const [code, qualified, recruits] of expected) {
    const position = dataset.positions.find((item) => Number(item.year) === 2024 && item.code === code);
    const row = dataset.observations.find((item) => item.sourceId === sourceId
      && Number(item.year) === 2024 && item.positionCode === code);
    assert.ok(position, `2024 position ${code} should exist in the position library`);
    assert.equal(position.recruitCount, recruits, `${code} local recruitment count should match the cited row`);
    assert.equal(row?.scope, 'position-level');
    assert.equal(row?.observedAt, '2023-11-15 18:00');
    assert.equal(row?.applicantsQualified, qualified);
    assert.equal(row?.recruitCount, recruits);
    assert.equal(row?.qualifiedCompetitionRatio, qualified / recruits);
    assert.ok(getPositionCompetitionEvidence(position, dataset).snapshots.includes(row));
  }

  const filtered = filterAndSortPositions(dataset.positions, {
    year: 2024,
    observations: dataset.observations,
    competitionEvidence: 'has',
  });
  for (const [code] of expected) {
    assert.ok(filtered.some((position) => position.year === 2024 && position.code === code), `${code} should remain discoverable with the competition-data filter`);
  }
});

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

test('2026 last-day qualified count links the uniquely named traffic-management post to the position library', async () => {
  const raw = JSON.parse(await readFile(new URL('../public/data.json', import.meta.url), 'utf8'));
  const dataset = normalizeDataset(raw);
  const sourceId = 'sohu-2026-final-day-snapshot-20251121-0900';
  const code = '232501603';
  const position = dataset.positions.find((item) => Number(item.year) === 2026 && item.code === code);
  const source = dataset.sources.find((item) => item.sourceId === sourceId);
  const rows = dataset.observations.filter((item) => item.sourceId === sourceId
    && Number(item.year) === 2026 && item.positionCode === code);

  assert.equal(source?.url, 'https://www.sohu.com/a/957051740_121124036');
  assert.equal(source?.observedAt, '2025-11-21 09:00');
  assert.equal(position?.unit, '北京市公安局公安交通管理局');
  assert.equal(position?.title, '一线执法岗');
  assert.equal(position?.recruitCount, 55);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].scope, 'position-level');
  assert.equal(rows[0].applicantsQualified, 1177);
  assert.equal(rows[0].recruitCount, 55);
  assert.equal(rows[0].qualifiedCompetitionRatio, 1177 / 55);
  assert.equal(rows[0].applicantsRegistered, null);
  assert.equal(rows[0].applicantsPaid, null);
  assert.equal(rows[0].actualTestTakers, null);
});

test('2026 Pinggu city-management cutoff is linked to its exact position code', async () => {
  const raw = JSON.parse(await readFile(new URL('../public/data.json', import.meta.url), 'utf8'));
  const dataset = normalizeDataset(raw);
  const positionCode = '821370301';
  const position = dataset.positions.find((item) => Number(item.year) === 2026 && item.code === positionCode);
  const cutoff = dataset.scoreRows.find((item) => item.id === '2026-cgzj-pinggu-10');
  const positionSource = dataset.sources.find((item) => item.sourceId === 'huatu-2026-pinggu-city-management-command');

  assert.equal(positionSource?.url, 'https://ah.huatu.com/zw/bjgwy/pinggu/2026_25.html');
  assert.equal(position?.unit, '北京市平谷区城市管理指挥中心');
  assert.equal(position?.title, '数据分析岗');
  assert.equal(position?.recruitCount, 1);
  assert.equal(cutoff?.positionCode, positionCode);
  assert.equal(cutoff?.score, 124.25);
  assert.equal(cutoff?.mappingConfidence, 'high');
});

test('2026 Pinggu summer-village and Liujiadian cutoffs link to exact position codes', async () => {
  const raw = JSON.parse(await readFile(new URL('../public/data.json', import.meta.url), 'utf8'));
  const dataset = normalizeDataset(raw);
  const expected = [
    {
      scoreId: '2026-cgzj-pinggu-15',
      code: '241371203',
      unit: '北京市平谷区夏各庄镇',
      title: '综合管理岗',
      score: 122,
      sources: [
        ['gwyzwb-2026-pinggu-xiagezhuang-index', 'https://bj.gwyzwb.com/pinggu/2026_33.html'],
        ['gwyzwb-2026-pinggu-xiagezhuang-detail', 'https://bj.gwyzwb.com/2026/1380.html'],
      ],
    },
    {
      scoreId: '2026-cgzj-pinggu-25',
      code: '241371801',
      unit: '北京市平谷区刘家店镇',
      title: '综合管理岗',
      score: 110.25,
      sources: [
        ['gwyzwb-2026-pinggu-liujiadian-index', 'https://bj.gwyzwb.com/pinggu/2026_39.html'],
        ['gwyzwb-2026-pinggu-liujiadian-detail', 'https://bj.gwyzwb.com/2026/1386.html'],
      ],
    },
  ];

  for (const item of expected) {
    const position = dataset.positions.find((row) => Number(row.year) === 2026 && row.code === item.code);
    const cutoff = dataset.scoreRows.find((row) => row.id === item.scoreId);
    assert.equal(position?.unit, item.unit);
    assert.equal(position?.title, item.title);
    assert.equal(position?.recruitCount, 2);
    assert.equal(cutoff?.positionCode, item.code);
    assert.equal(cutoff?.score, item.score);
    assert.equal(cutoff?.mappingConfidence, 'high');
    assert.equal(getPositionCompetitionEvidence(position, dataset).cutoffScore, item.score);

    for (const [sourceId, url] of item.sources) {
      const source = dataset.sources.find((row) => row.sourceId === sourceId);
      assert.equal(source?.url, url);
      assert.ok(position.sources.includes(sourceId));
    }
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
  assert.equal(cutoffs.filter((item) => item.mappingConfidence === 'high').length, 26);
  assert.equal(cutoffs.filter((item) => item.mappingConfidence === 'ambiguous').length, 2);
  assert.equal(cutoffs.filter((item) => item.mappingConfidence === 'unmatched').length, 0);
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
        ['232501603', 117, 55],
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
        ['232501603', 184, 55],
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
        ['232501603', 450, 55],
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
        ['232501603', 502, 55],
        ['821261102', 275, 2],
        ['232502501', 249, 30],
        ['232502102', 214, 32],
        ['821263001', 95, 1],
        ['232502901', 187, 23],
        ['230531801', 71, 1],
        ['232502003', 183, 32],
        ['232502201', 120, 22],
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

test('2026 Nov 20 09:00 snapshot links the traffic-management position and qualified-applicant ratio by code', async () => {
  const raw = JSON.parse(await readFile(new URL('../public/data.json', import.meta.url), 'utf8'));
  const dataset = normalizeDataset(raw);
  const sourceId = 'zhonggong-2026-snapshot-20251120-0900';
  const code = '232501603';
  const position = dataset.positions.find((item) => item.year === 2026 && item.code === code);
  const source = dataset.sources.find((item) => item.sourceId === sourceId);
  const observation = dataset.observations.find((item) => item.sourceId === sourceId
    && item.year === 2026 && item.positionCode === code);

  assert.equal(source?.url, 'https://www.10100.com/article/103413571');
  assert.equal(source?.observedAt, '2025-11-20 09:00');
  assert.equal(position?.unit, '北京市公安局公安交通管理局');
  assert.equal(position?.title, '一线执法岗');
  assert.equal(position?.recruitCount, 55);
  assert.equal(observation?.scope, 'position-level');
  assert.equal(observation?.applicantsQualified, 822);
  assert.equal(observation?.recruitCount, 55);
  assert.equal(observation?.qualifiedCompetitionRatio, 822 / 55);
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

test('2026 Chaoyang reported application counts remain separate from qualification snapshots and link by code', async () => {
  const raw = JSON.parse(await readFile(new URL('../public/data.json', import.meta.url), 'utf8'));
  const dataset = normalizeDataset(raw);
  const position = dataset.positions.find((item) => item.year === 2026 && item.code === '820526204');
  const observation = dataset.observations.find((item) => item.year === 2026
    && item.positionCode === '820526204' && item.sourceId === 'fenbi-2026-chaoyang-page-3');
  const evidence = getPositionCompetitionEvidence(position, dataset);

  assert.ok(position, 'the HR comprehensive writing post should be present in the job library');
  assert.equal(position.unit, '北京市朝阳区人力资源和社会保障局');
  assert.equal(position.title, '综合文稿岗');
  assert.equal(position.recruitCount, 2);
  assert.equal(observation?.observationType, 'registration_snapshot');
  assert.equal(observation?.applicantsRegistered, 15);
  assert.equal(observation?.applicantsQualified, null, 'Fenbi list count is not qualification-passed count');
  assert.equal(observation?.observedAt, null, 'the source page does not state a count timestamp');
  assert.equal(evidence.registrationSnapshots.length, 1);
  assert.equal(evidence.latestRegistrationSnapshot.applicantsRegistered, 15);
  assert.equal(evidence.registeredCompetitionRatio, 7.5);
});

test('2026 Haidian and Xicheng reported applicant counts link by exact code and keep the undocumented timestamp separate', async () => {
  const raw = JSON.parse(await readFile(new URL('../public/data.json', import.meta.url), 'utf8'));
  const dataset = normalizeDataset(raw);
  const expected = [
    ['haidian-2026-fenbi-page-1', '819909904', 1, 22],
    ['haidian-2026-fenbi-page-1', '526012201', 1, 8],
    ['haidian-2026-fenbi-page-1', '526012202', 1, 8],
    ['haidian-2026-fenbi-page-1', '526012204', 1, 1],
    ['haidian-2026-fenbi-page-1', '526012205', 1, 5],
    ['haidian-2026-fenbi-page-1', '526012206', 15, 23],
    ['haidian-2026-fenbi-page-1', '625014301', 2, 17],
    ['haidian-2026-fenbi-page-1', '625014302', 4, 8],
    ['haidian-2026-fenbi-page-1', '120636201', 2, 22],
    ['haidian-2026-fenbi-page-1', '120632601', 1, 118],
    ['haidian-2026-fenbi-page-2', '120632701', 1, 13],
    ['haidian-2026-fenbi-page-2', '120632702', 1, 9],
    ['haidian-2026-fenbi-page-2', '120632801', 1, 11],
    ['haidian-2026-fenbi-page-2', '120632802', 2, 31],
    ['haidian-2026-fenbi-page-2', '120632901', 1, 8],
    ['haidian-2026-fenbi-page-2', '120633001', 2, 19],
    ['haidian-2026-fenbi-page-2', '120633101', 2, 16],
    ['haidian-2026-fenbi-page-2', '120633201', 2, 20],
    ['haidian-2026-fenbi-page-2', '120633301', 1, 5],
    ['haidian-2026-fenbi-page-2', '820633401', 2, 40],
    ['xicheng-2026-mirror-016', '234104501', 5, 25],
    ['xicheng-2026-mirror-016', '234104502', 1, 1],
    ['xicheng-2026-mirror-016', '234104503', 1, 3],
    ['xicheng-2026-mirror-016', '526012001', 24, 87],
    ['xicheng-2026-mirror-016', '526012002', 2, 88],
    ['xicheng-2026-mirror-016', '625014101', 12, 48],
    ['xicheng-2026-mirror-016', '625014102', 1, 6],
    ['xicheng-2026-mirror-016', '625014103', 1, 11],
    ['xicheng-2026-mirror-016', '625014104', 1, 8],
    ['xicheng-2026-mirror-016', '120223401', 1, 15],
    ['xicheng-2026-mirror-008', '120223402', 4, 75],
    ['xicheng-2026-mirror-008', '120220901', 10, 88],
    ['xicheng-2026-mirror-008', '120220902', 8, 107],
    ['xicheng-2026-mirror-008', '120220903', 4, 18],
    ['xicheng-2026-mirror-008', '120220904', 10, 143],
    ['xicheng-2026-mirror-008', '120220905', 8, 133],
    ['xicheng-2026-mirror-008', '120220906', 10, 227],
    ['xicheng-2026-mirror-008', '120221001', 2, 10],
    ['xicheng-2026-mirror-008', '820221101', 2, 22],
    ['xicheng-2026-mirror-008', '820221102', 1, 13],
  ];

  assert.equal(expected.length, 40);
  for (const [sourceId, code, recruits, applicants] of expected) {
    const position = dataset.positions.find((item) => item.year === 2026 && item.code === code);
    const rows = dataset.observations.filter((item) => item.year === 2026
      && item.sourceId === sourceId && item.positionCode === code);
    const evidence = getPositionCompetitionEvidence(position, dataset);

    assert.ok(position, `position ${code} should exist in the 2026 library`);
    assert.equal(position.recruitCount, recruits, `${code} planned recruits should match the source listing`);
    assert.equal(rows.length, 1, `${code} should have one source-linked applicant observation`);
    assert.equal(rows[0].observationType, 'registration_snapshot');
    assert.equal(rows[0].applicantsRegistered, applicants);
    assert.equal(rows[0].applicantsQualified, null);
    assert.equal(rows[0].observedAt, null, 'the source listing does not state a count timestamp');
    assert.equal(rows[0].registeredCompetitionRatio, applicants / recruits);
    assert.equal(evidence.latestRegistrationSnapshot.positionCode, code);
  }
});

test('2026 Fangshan and Tongzhou applicant counts use only unique local position matches', async () => {
  const raw = JSON.parse(await readFile(new URL('../public/data.json', import.meta.url), 'utf8'));
  const dataset = normalizeDataset(raw);
  const expected = [
    ['fenbi-2026-fangshan-page-1', '526012603', 16, 55],
    ['fenbi-2026-fangshan-page-1', '625014701', 6, 18],
    ['fenbi-2026-fangshan-page-1', '121051401', 2, 9],
    ['fenbi-2026-fangshan-page-1', '121051402', 2, 12],
    ['fenbi-2026-fangshan-page-1', '121049301', 1, 15],
    ['fenbi-2026-fangshan-page-1', '121049302', 1, 6],
    ['fenbi-2026-fangshan-page-1', '821049501', 1, 9],
    ['fenbi-2026-tongzhou-page-2', '121153401', 1, 20],
    ['fenbi-2026-tongzhou-page-2', '821153501', 2, 37],
    ['fenbi-2026-tongzhou-page-2', '221153801', 2, 9],
    ['fenbi-2026-tongzhou-page-2', '221153901', 2, 23],
    ['fenbi-2026-tongzhou-page-2', '821153902', 2, 35],
    ['fenbi-2026-tongzhou-page-2', '821153903', 4, 29],
    ['fenbi-2026-tongzhou-page-2', '821154001', 2, 13],
    ['fenbi-2026-tongzhou-page-2', '821154003', 2, 27],
  ];

  for (const [sourceId, code, recruits, applicants] of expected) {
    const position = dataset.positions.find((item) => item.year === 2026 && item.code === code);
    const observation = dataset.observations.find((item) => item.year === 2026
      && item.sourceId === sourceId && item.positionCode === code);
    assert.ok(position, `position ${code} should exist in the 2026 library`);
    assert.equal(position.recruitCount, recruits, `${code} planned recruits should match the source row`);
    assert.equal(observation?.scope, 'position-level');
    assert.equal(observation?.applicantsRegistered, applicants);
    assert.equal(observation?.applicantsQualified, null);
    assert.equal(observation?.observedAt, null, 'the mobile listing does not state an applicant-count timestamp');
    assert.equal(observation?.registeredCompetitionRatio, applicants / recruits);
  }

  for (const code of ['526012601', '526012602']) {
    assert.equal(dataset.observations.some((item) => item.sourceId === 'fenbi-2026-fangshan-page-1'
      && item.positionCode === code), false, `${code} shares an indistinguishable source title and must stay unlinked`);
  }
});

test('2026 Dongcheng applicant counts attach only to exact code-and-recruitment matches', async () => {
  const raw = JSON.parse(await readFile(new URL('../public/data.json', import.meta.url), 'utf8'));
  const dataset = normalizeDataset(raw);
  const expected = [
    ['fenbi-2026-dongcheng-page-1', '820116201', 1, 4],
    ['fenbi-2026-dongcheng-page-2', '220116602', 1, 11],
    ['fenbi-2026-dongcheng-page-2', '820116801', 2, 6],
    ['fenbi-2026-dongcheng-page-2', '220116601', 2, 29],
    ['fenbi-2026-dongcheng-page-3', '220116901', 1, 24],
    ['fenbi-2026-dongcheng-page-4', '220117101', 1, 17],
    ['fenbi-2026-dongcheng-page-4', '820117004', 1, 10],
    ['fenbi-2026-dongcheng-page-4', '820117202', 1, 49],
    ['fenbi-2026-dongcheng-page-5', '220117303', 1, 36],
    ['fenbi-2026-dongcheng-page-5', '220117401', 1, 19],
    ['fenbi-2026-dongcheng-page-6', '220117505', 2, 47],
    ['fenbi-2026-dongcheng-page-6', '220117801', 2, 28],
    ['fenbi-2026-dongcheng-page-6', '220118001', 1, 25],
    ['fenbi-2026-dongcheng-page-7', '220118301', 1, 11],
    ['fenbi-2026-dongcheng-page-7', '220118401', 1, 12],
    ['fenbi-2026-dongcheng-page-8', '820118603', 1, 16],
    ['fenbi-2026-dongcheng-page-8', '720119001', 1, 26],
    ['fenbi-2026-dongcheng-page-9', '230119501', 1, 10],
    ['fenbi-2026-dongcheng-page-9', '230119503', 2, 34],
    ['fenbi-2026-dongcheng-page-9', '230119601', 1, 29],
    ['fenbi-2026-dongcheng-page-10', '230119801', 2, 12],
    ['fenbi-2026-dongcheng-page-10', '230119802', 1, 1],
  ];

  for (const [sourceId, code, recruits, applicants] of expected) {
    const position = dataset.positions.find((item) => item.year === 2026 && item.code === code);
    const observation = dataset.observations.find((item) => item.year === 2026
      && item.sourceId === sourceId && item.positionCode === code);

    assert.equal(position?.districtId, 'dongcheng', `${code} should be a Dongcheng position`);
    assert.equal(position?.recruitCount, recruits, `${code} planned recruits should match the listing`);
    assert.equal(observation?.scope, 'position-level');
    assert.equal(observation?.applicantsRegistered, applicants);
    assert.equal(observation?.applicantsQualified, null);
    assert.equal(observation?.observedAt, null, 'Fenbi does not state the per-position count timestamp');
    assert.equal(observation?.registeredCompetitionRatio, applicants / recruits);
  }

  assert.equal(dataset.sources.find((item) => item.sourceId === 'fenbi-2026-dongcheng-page-10')?.reportedPositionCount, 10);
  assert.equal(dataset.observations.some((item) => item.year === 2026
    && item.sourceId.startsWith('fenbi-2026-dongcheng-') && item.positionCode === '232501801'), false,
  'the police role is not listed in the captured district pages and must remain without a reported count');
});

test('2026 Xicheng Fenbi applicant counts cover only exact position-code matches', async () => {
  const raw = JSON.parse(await readFile(new URL('../public/data.json', import.meta.url), 'utf8'));
  const dataset = normalizeDataset(raw);
  const expectedSamples = [
    ['fenbi-2026-xicheng-page-1', '526012002', 2, 88],
    ['fenbi-2026-xicheng-page-2', '120220906', 10, 227],
    ['fenbi-2026-xicheng-page-3', '220221502', 4, 193],
    ['fenbi-2026-xicheng-page-4', '820221802', 2, 52],
    ['fenbi-2026-xicheng-page-5', '220222301', 2, 52],
    ['fenbi-2026-xicheng-page-6', '220222510', 2, 0],
    ['fenbi-2026-xicheng-page-7', '820223003', 2, 49],
    ['fenbi-2026-xicheng-page-8', '820223801', 1, 48],
    ['fenbi-2026-xicheng-page-9', '230224201', 4, 41],
    ['fenbi-2026-xicheng-page-10', '230225101', 4, 38],
    ['fenbi-2026-xicheng-page-11', '230224001', 4, 22],
    ['fenbi-2026-xicheng-page-12', '220222203', 1, 11],
  ];
  const sources = dataset.sources.filter((item) => item.sourceId.startsWith('fenbi-2026-xicheng-page-'));
  const observations = dataset.observations.filter((item) => item.year === 2026
    && item.sourceId.startsWith('fenbi-2026-xicheng-page-'));

  assert.equal(sources.length, 12);
  assert.equal(observations.length, 114);
  assert.equal(new Set(observations.map((item) => item.positionCode)).size, 114);
  assert.deepEqual(sources.map((item) => item.positionSnapshots.length), [10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 4]);

  for (const [sourceId, code, recruits, applicants] of expectedSamples) {
    const position = dataset.positions.find((item) => item.year === 2026 && item.code === code);
    const observation = observations.find((item) => item.sourceId === sourceId && item.positionCode === code);
    const source = sources.find((item) => item.sourceId === sourceId);

    assert.equal(source?.districtId, 'xicheng', `${sourceId} should represent the Xicheng listing page`);
    assert.ok(position, `${code} should match a position in the library`);
    assert.equal(position?.recruitCount, recruits);
    assert.equal(observation?.applicantsRegistered, applicants);
    assert.equal(observation?.applicantsQualified, null);
    assert.equal(observation?.observedAt, null, 'Fenbi does not state the per-position count timestamp');
    assert.equal(observation?.registeredCompetitionRatio, applicants / recruits);
  }

  for (const observation of observations) {
    const position = dataset.positions.find((item) => item.year === 2026 && item.code === observation.positionCode);
    assert.ok(position, `${observation.positionCode} should match a position in the library`);
    assert.equal(position?.recruitCount, observation.recruitCount,
      `${observation.positionCode} planned recruits should match the listing`);
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

test('2026 Shunyi cutoff sample links newly sourced positions by unique code and title', async () => {
  const raw = JSON.parse(await readFile(new URL('../public/data.json', import.meta.url), 'utf8'));
  const dataset = normalizeDataset(raw);
  const cutoffSourceId = 'cgzj-2026-shunyi-cutoff-sample';
  const expected = [
    ['221457301', '北京市顺义区财政局', '预算管理岗', 2, 127.5, 'xduim-2026-shunyi-code-list'],
    ['821456701', '中共北京市顺义区委党校（顺义区行政学院）', '综合管理岗', 3, 125.75, 'gwyzwb-2026-shunyi-party-school'],
    ['231458202', '北京市顺义区市场监督管理局（北京市顺义区知识产权局）', '监督管理岗', 1, 125.25, 'gwyzwb-2026-shunyi-market-supervision'],
    ['821457401', '北京市顺义区人力资源和社会保障局', '案件审理岗', 1, 122.25, 'gwyzwb-2026-shunyi-labor-arbitration'],
  ];

  for (const [code, unit, title, recruits, score, positionSourceId] of expected) {
    const positions = dataset.positions.filter((item) => item.year === 2026 && item.code === code);
    assert.equal(positions.length, 1, `${code} should identify exactly one 2026 position`);
    const [position] = positions;
    assert.equal(position.unit, unit);
    assert.equal(position.title, title);
    assert.equal(position.recruitCount, recruits);
    assert.ok(position.sources.includes(positionSourceId));
    assert.ok(dataset.sources.some((item) => item.sourceId === positionSourceId));

    const scoreRows = dataset.scoreRows.filter((item) => item.year === 2026
      && item.sourceId === cutoffSourceId && item.positionCode === code);
    assert.equal(scoreRows.length, 1, `${code} should have one linked minimum interview score`);
    assert.equal(scoreRows[0].score, score);
    assert.equal(scoreRows[0].mappingConfidence, 'high');
    assert.equal(getPositionCompetitionEvidence(position, dataset).cutoffScore, score);
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
    {
      sourceId: 'huatu-2025-citywide-top-jobs-20241121-0900',
      year: 2025,
      observedAt: '2024-11-21 09:00',
      url: 'https://www.huatu.com/2024/1121/2789840.html',
      expected: [
        ['242502301', 289, 44],
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

  const fangshanPosition = dataset.positions.find((item) => item.year === 2025 && item.code === '242502301');
  const fangshanEvidence = getPositionCompetitionEvidence(fangshanPosition, dataset);
  assert.equal(fangshanEvidence.snapshots.find((item) => item.sourceId === 'huatu-2025-citywide-top-jobs-20241121-0900')?.qualifiedCompetitionRatio, 289 / 44);
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

test('2026 first-day Daxing single-position unit count links to its exact TianGongyuan job', async () => {
  const raw = JSON.parse(await readFile(new URL('../public/data.json', import.meta.url), 'utf8'));
  const dataset = normalizeDataset(raw);
  const sourceId = 'eoffcn-2026-snapshot-20251117-1800';
  const position = dataset.positions.find((item) => item.year === 2026 && item.code === '231568301');
  const rows = dataset.observations.filter((item) => item.sourceId === sourceId
    && item.year === 2026 && item.positionCode === '231568301');

  assert.equal(position?.unit, '北京市大兴区天宫院街道');
  assert.equal(position?.title, '行政执法岗');
  assert.equal(position?.recruitCount, 2);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].scope, 'position-level');
  assert.equal(rows[0].observedAt, '2025-11-17 18:00');
  assert.equal(rows[0].applicantsQualified, 20);
  assert.equal(rows[0].recruitCount, 2);
  assert.equal(rows[0].qualifiedCompetitionRatio, 10);
});

test('un-timestamped third-party registration counts stay separate and support position filtering and comparison', () => {
  const positions = [
    { year: 2026, code: '820526204', unit: '北京市朝阳区人力资源和社会保障局', title: '综合文稿岗', recruitCount: 2 },
    { year: 2026, code: '220526701', unit: '北京市朝阳区文化和旅游局', title: '综合管理岗', recruitCount: 1 },
    { year: 2026, code: 'not-observed', unit: '北京市朝阳区其他单位', title: '未观察岗位', recruitCount: 1 },
  ];
  const observations = [
    {
      year: 2026, positionCode: '820526204', scope: 'position-level', observationType: 'registration_snapshot',
      observedAt: null, applicantsRegistered: 15, applicantsQualified: null, recruitCount: 2, sourceId: 'fenbi-page-3',
    },
    {
      year: 2026, positionCode: '220526701', scope: 'position-level', observationType: 'registration_snapshot',
      observedAt: null, applicantsRegistered: 23, applicantsQualified: null, recruitCount: 1, sourceId: 'fenbi-page-4',
    },
  ];
  const hrEvidence = getPositionCompetitionEvidence(positions[0], { observations, scoreRows: [] });

  assert.equal(hrEvidence.latestRegistrationSnapshot.applicantsRegistered, 15);
  assert.equal(hrEvidence.latestRegistrationSnapshot.applicantsQualified, null);
  assert.equal(hrEvidence.latestRegistrationSnapshot.observedAt, null);
  assert.equal(hrEvidence.registeredCompetitionRatio, 7.5);
  assert.equal(hrEvidence.qualifiedCompetitionRatio, null);

  const hasRegistration = filterAndSortPositions(positions, {
    observations,
    competitionEvidence: 'has',
    sortBy: 'registration-desc',
  });
  assert.deepEqual(hasRegistration.map((position) => position.code), ['220526701', '820526204']);
  assert.deepEqual(filterAndSortPositions(positions, {
    observations,
    competitionEvidence: 'missing',
  }).map((position) => position.code), ['not-observed']);
});
