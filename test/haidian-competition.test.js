import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { normalizeDataset } from '../src/data/normalize.js';
import { getPositionCompetitionEvidence } from '../src/data/positions.js';

test('Haidian 2025 dated qualified-count snapshots link to exact positions without implying final registrations', async () => {
  const raw = JSON.parse(await readFile(new URL('../public/data.json', import.meta.url), 'utf8'));
  const dataset = normalizeDataset(raw);
  const positions = [
    ['232501902', '北京市公安局海淀分局', '一线执法岗1', 77],
    ['220633901', '北京市海淀区发展和改革委员会', '综合管理岗', 2],
  ];
  const expected = [
    ['232501902', 'eoffcn-2025-citywide-top10-qualified-20241119-0900', '2024-11-19 09:00', 119, 77, 1.5454545454545454],
    ['232501902', 'eoffcn-2025-citywide-hot-jobs-20241122-0900', '2024-11-22 09:00', 605, 77, 7.857142857142857],
    ['220633901', 'huatu-2025-citywide-top10-qualified', '2024-11-21 09:00', 193, 2, 96.5],
    ['220633901', 'eoffcn-2025-citywide-hot-jobs-20241122-0900', '2024-11-22 09:00', 304, 2, 152],
  ];

  for (const [code, unit, title, recruits] of positions) {
    const position = dataset.positions.find((item) => item.year === 2025 && item.code === code);
    assert.equal(position?.unit, unit, `${code} unit`);
    assert.equal(position?.title, title, `${code} title`);
    assert.equal(position?.districtId, 'haidian', `${code} district`);
    assert.equal(position?.recruitCount, recruits, `${code} planned recruits`);
  }

  for (const [code, sourceId, observedAt, qualified, recruits, ratio] of expected) {
    const row = dataset.observations.find((item) => item.year === 2025 && item.positionCode === code
      && item.sourceId === sourceId && item.observedAt === observedAt);
    assert.equal(row?.scope, 'position-level', `${code} scope`);
    assert.equal(row?.applicantsQualified, qualified, `${code} qualified count at ${observedAt}`);
    assert.equal(row?.recruitCount, recruits, `${code} denominator at ${observedAt}`);
    assert.equal(row?.qualifiedCompetitionRatio, ratio, `${code} qualified-per-recruit ratio`);
    assert.equal(row?.applicantsRegistered, null, 'application submissions were not reported');
    assert.equal(row?.applicantsPaid, null, 'paid registrations were not reported');
    assert.equal(row?.actualTestTakers, null, 'actual test attendance was not reported');
  }
});

test('Haidian 2026 Fenbi applicant-count rows link to exact position codes and keep the count definition caveat', async () => {
  const raw = JSON.parse(await readFile(new URL('../public/data.json', import.meta.url), 'utf8'));
  const dataset = normalizeDataset(raw);
  const pages = dataset.sources.filter((source) => /^haidian-2026-fenbi-page-(?:[1-9]|1[0-5])$/.test(source.sourceId));
  const snapshots = pages.flatMap((source) => (source.positionSnapshots || []).map((snapshot) => ({
    ...snapshot,
    sourceId: source.sourceId,
  })));

  assert.equal(pages.length, 15);
  assert.equal(snapshots.length, 142);
  assert.equal(new Set(snapshots.map((row) => row.positionCode)).size, 142);
  assert.equal(snapshots.reduce((sum, row) => sum + row.applicantsRegistered, 0), 4043);
  assert.equal(snapshots.reduce((sum, row) => sum + row.recruitCount, 0), 295);

  for (const source of pages) {
    assert.equal(source.positionSnapshots.length, source.reportedPositionCount, source.sourceId);
    assert.equal(source.positionSnapshots.reduce((sum, row) => sum + row.recruitCount, 0), source.reportedRecruitCount, source.sourceId);
    if (Number(source.sourceId.split('-').at(-1)) >= 3) {
      assert.equal(source.accessedAt, '2026-10-12');
      assert.match(source.notes, /顶部汇总标题为“过审人数”/);
      assert.match(source.notes, /逐岗列标题却为“报考人数”/);
    }
  }

  for (const row of snapshots) {
    const position = dataset.positions.find((item) => item.year === 2026 && item.code === row.positionCode);
    assert.ok(position, `position ${row.positionCode} exists`);
    assert.equal(position.recruitCount, row.recruitCount, `${row.positionCode} planned recruits`);
    const observation = dataset.observations.find((item) => item.year === 2026
      && item.positionCode === row.positionCode && item.sourceId === row.sourceId);
    assert.equal(observation?.observationType, 'registration_snapshot', `${row.positionCode} metric type`);
    assert.equal(observation?.applicantsRegistered, row.applicantsRegistered, `${row.positionCode} source count`);
    assert.equal(observation?.applicantsQualified, null, `${row.positionCode} is not relabeled as official qualification count`);
    assert.equal(observation?.observedAt, null, `${row.positionCode} has no stated snapshot time`);
    const evidence = getPositionCompetitionEvidence(position, {
      observations: dataset.observations,
      scoreRows: dataset.scoreRows,
    });
    assert.equal(evidence.registeredCompetitionRatio, row.applicantsRegistered / row.recruitCount, `${row.positionCode} ratio`);
  }
});
