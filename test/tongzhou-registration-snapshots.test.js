import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { filterAndSortPositions, getPositionCompetitionEvidence } from '../src/data/positions.js';

const dataset = JSON.parse(await readFile(new URL('../public/data.json', import.meta.url), 'utf8'));

const expected = new Map([
  ['526012701', [4, 6, 1]],
  ['526012702', [8, 19, 1]],
  ['526012703', [1, 2, 1]],
  ['625014801', [4, 13, 1]],
  ['625014802', [2, 5, 1]],
  ['625014803', [1, 4, 1]],
  ['625014805', [2, 0, 1]],
  ['625014806', [2, 1, 1]],
  ['121153301', [2, 25, 1]],
  ['221154301', [1, 29, 4]],
  ['221154806', [2, 6, 5]],
  ['221154807', [1, 8, 5]],
  ['231154801', [1, 24, 5]],
  ['231154802', [2, 90, 5]],
  ['231154803', [4, 47, 5]],
  ['231154804', [2, 32, 5]],
  ['231154805', [2, 14, 5]],
  ['221154901', [1, 23, 5]],
  ['221154902', [1, 184, 5]],
  ['221155001', [2, 110, 6]],
  ['221155101', [2, 47, 6]],
  ['221155201', [1, 26, 6]],
  ['221155202', [1, 12, 6]],
  ['221155301', [1, 115, 6]],
  ['221155302', [1, 14, 6]],
  ['821155501', [1, 26, 6]],
  ['625014804', [1, 2, 8]],
  ['221154101', [1, 0, 8]],
  ['821155702', [1, 0, 8]],
  ['231155902', [1, 1, 8]],
]);

test('Tongzhou 2026 Fenbi applicant counts link only uniquely matched positions as untimed references', () => {
  const sourceIds = new Set([...expected.values()].map(([, , page]) => `fenbi-2026-tongzhou-page-${page}`));
  for (const sourceId of sourceIds) {
    assert.ok(dataset.sources.some((source) => source.sourceId === sourceId), `${sourceId} should be registered`);
  }

  const rows = dataset.observations.filter((row) => sourceIds.has(row.sourceId));
  assert.equal(rows.length, expected.size);

  for (const [code, [recruitCount, applicantsRegistered, page]] of expected) {
    const position = dataset.positions.find((item) => item.year === 2026 && item.code === code);
    assert.ok(position, `${code} should resolve to a local 2026 position`);
    assert.equal(position.districtId, 'tongzhou');
    assert.equal(position.recruitCount, recruitCount);

    const row = rows.find((item) => item.positionCode === code);
    assert.ok(row, `${code} should have a linked third-party count`);
    assert.equal(row.sourceId, `fenbi-2026-tongzhou-page-${page}`);
    assert.equal(row.applicantsRegistered, applicantsRegistered);
    assert.equal(row.applicantsQualified, null);
    assert.equal(row.observedAt, null);
    assert.equal(getPositionCompetitionEvidence(position, dataset).registeredCompetitionRatio,
      applicantsRegistered / recruitCount);
  }

  for (const ambiguousCode of ['221154401', '221154402', '221154501', '221154502', '821155503']) {
    assert.equal(rows.some((row) => row.positionCode === ambiguousCode), false,
      `${ambiguousCode} must not receive a guessed page match`);
  }
});

test('Tongzhou positions sort by linked per-slot Fenbi applicant references', () => {
  const positions = dataset.positions.filter((position) => position.year === 2026 && position.districtId === 'tongzhou');
  const sorted = filterAndSortPositions(positions, {
    observations: dataset.observations,
    scoreRows: dataset.scoreRows,
    sortBy: 'registration-desc',
  });

  assert.deepEqual(sorted.slice(0, 3).map((position) => position.code), ['221154902', '221155301', '221155001']);
});

test('Tongzhou position entries expose linked application ratio together with minimum interview score', () => {
  for (const [code, cutoffScore, registeredRatio] of [
    ['821153902', 142, 17.5],
    ['221153901', 132.5, 11.5],
  ]) {
    const position = dataset.positions.find((item) => item.year === 2026 && item.code === code);
    assert.ok(position, `${code} should resolve to a local 2026 position`);
    const evidence = getPositionCompetitionEvidence(position, dataset);
    assert.equal(evidence.cutoffScore, cutoffScore);
    assert.equal(evidence.registeredCompetitionRatio, registeredRatio);
    assert.ok(evidence.cutoffSourceIds.length > 0);
    assert.ok(evidence.registrationSourceIds.length > 0);
  }
});
