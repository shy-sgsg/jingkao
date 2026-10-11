import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { filterAndSortPositions, getPositionCompetitionEvidence } from '../src/data/positions.js';

const dataset = JSON.parse(await readFile(new URL('../public/data.json', import.meta.url), 'utf8'));

const expected = new Map([
  ['821050001', [2, 103, 3]],
  ['221050003', [4, 49, 3]],
  ['221050101', [2, 21, 3]],
  ['221050102', [2, 49, 3]],
  ['221050201', [1, 25, 3]],
  ['221050202', [1, 4, 3]],
  ['221050301', [1, 4, 3]],
  ['221050302', [1, 6, 3]],
  ['221050401', [4, 24, 3]],
  ['221050501', [2, 12, 3]],
  ['221050502', [2, 80, 4]],
  ['221050503', [4, 48, 4]],
  ['231050702', [1, 12, 4]],
  ['241050701', [2, 29, 5]],
  ['821050801', [2, 36, 5]],
  ['221051101', [1, 23, 5]],
  ['221051201', [1, 15, 6]],
  ['221051202', [2, 13, 6]],
  ['821051301', [2, 86, 6]],
  ['231051502', [1, 21, 6]],
  ['231051503', [1, 2, 6]],
  ['231051601', [2, 11, 6]],
  ['231051701', [4, 9, 6]],
  ['231051801', [1, 0, 6]],
  ['241051901', [2, 75, 6]],
  ['231052001', [1, 132, 6]],
  ['231052002', [1, 16, 7]],
  ['241052101', [1, 44, 7]],
  ['241052102', [1, 6, 7]],
  ['241052202', [2, 56, 7]],
  ['241052401', [1, 19, 7]],
  ['241052501', [1, 15, 7]],
  ['241052801', [1, 23, 7]],
  ['241052901', [1, 22, 7]],
  ['241052902', [2, 10, 8]],
  ['241053001', [2, 73, 8]],
  ['221053202', [2, 1, 8]],
  ['241052601', [1, 1, 10]],
  ['231053207', [1, 31, 9]],
  ['221050601', [1, 1, 9]],
  ['221051203', [1, 3, 9]],
  ['231051501', [2, 14, 9]],
  ['221053201', [1, 0, 9]],
  ['241052201', [1, 2, 9]],
  ['231052301', [1, 1, 9]],
]);

test('Fangshan Fenbi rows link only unique job matches and keep reported applicants separate from qualification snapshots', () => {
  const sourceIds = new Set([...expected.values()].map(([, , page]) => `fenbi-2026-fangshan-page-${page}`));
  for (const sourceId of sourceIds) {
    assert.ok(dataset.sources.some((source) => source.sourceId === sourceId), `${sourceId} should be registered`);
  }

  const rows = dataset.observations.filter((row) => sourceIds.has(row.sourceId));
  assert.equal(rows.length, expected.size);

  for (const [code, [recruitCount, applicantsRegistered, page]] of expected) {
    const position = dataset.positions.find((item) => item.year === 2026 && item.code === code);
    assert.ok(position, `${code} should resolve to an existing position`);
    const row = rows.find((item) => item.positionCode === code);
    assert.ok(row, `${code} should have its source count linked`);
    assert.equal(row.sourceId, `fenbi-2026-fangshan-page-${page}`);
    assert.equal(row.recruitCount, recruitCount);
    assert.equal(position.recruitCount, recruitCount);
    assert.equal(row.applicantsRegistered, applicantsRegistered);
    assert.equal(row.applicantsQualified, null);
    assert.equal(row.observedAt, null);
    assert.equal(getPositionCompetitionEvidence(position, dataset).registeredCompetitionRatio,
      applicantsRegistered / recruitCount);
  }

  for (const ambiguousCode of ['231050711', '231050713', '821050901', '821050902', '241052701', '241052702', '241053101', '241053102']) {
    assert.equal(rows.some((row) => row.positionCode === ambiguousCode), false,
      `${ambiguousCode} must not receive a guessed page match`);
  }
});

test('Fangshan positions sort by the per-post reported applicants per planned slot', () => {
  const positions = dataset.positions.filter((position) => position.year === 2026 && position.districtId === 'fangshan');
  const sorted = filterAndSortPositions(positions, {
    observations: dataset.observations,
    scoreRows: dataset.scoreRows,
    sortBy: 'registration-desc',
  });

  assert.deepEqual(sorted.slice(0, 3).map((position) => position.code), ['231052001', '821050001', '241052101']);
});

test('Fangshan position entries expose linked registration and minimum interview score evidence together', () => {
  const expected = new Map([
    ['121049302', [136.25, 6]],
    ['221050202', [133.5, 4]],
    ['821049501', [130.75, 9]],
    ['221050003', [129.5, 12.25]],
    ['221050102', [127.5, 24.5]],
    ['241052101', [126.75, 44]],
    ['231051502', [102.5, 21]],
    ['241051901', [100.75, 37.5]],
  ]);

  for (const [code, [cutoffScore, registeredRatio]] of expected) {
    const position = dataset.positions.find((item) => item.year === 2026 && item.code === code);
    assert.ok(position, `${code} should resolve to the position entry`);
    const evidence = getPositionCompetitionEvidence(position, dataset);
    assert.equal(evidence.cutoffScore, cutoffScore);
    assert.equal(evidence.registeredCompetitionRatio, registeredRatio);
    assert.ok(evidence.cutoffSourceIds.length > 0);
    assert.ok(evidence.registrationSourceIds.length > 0);
  }
});
