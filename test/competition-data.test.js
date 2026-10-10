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
  const sourceId = 'eoffcn-2025-tongzhou-final-day-snapshot';
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
