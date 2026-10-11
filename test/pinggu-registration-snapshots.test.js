import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { filterAndSortPositions, getPositionCompetitionEvidence } from '../src/data/positions.js';

const dataset = JSON.parse(await readFile(new URL('../public/data.json', import.meta.url), 'utf8'));

const expected = new Map([
  ['821368802', [10, 1, 2]],
  ['821368902', [17, 2, 2]],
  ['821369003', [65, 1, 2]],
  ['221369101', [6, 1, 2]],
  ['221369601', [18, 2, 3]],
  ['221369701', [62, 2, 3]],
  ['821370201', [42, 1, 4]],
  ['821370301', [12, 1, 4]],
  ['241370502', [8, 2, 4]],
  ['241370901', [17, 1, 5]],
  ['241370902', [49, 1, 5]],
  ['241371203', [92, 2, 5]],
  ['241371301', [35, 1, 5]],
]);

test('Pinggu Fenbi rows link to unique positions and remain untimed application references', () => {
  const sourceIds = new Set([...expected.values()].map(([, , page]) => `pinggu-2026-fenbi-page-${page}`));
  for (const sourceId of sourceIds) {
    assert.ok(dataset.sources.some((source) => source.sourceId === sourceId), `${sourceId} should be registered`);
  }

  const rows = dataset.observations.filter((row) => sourceIds.has(row.sourceId));
  assert.equal(rows.length, expected.size);

  for (const [code, [applicantsRegistered, recruitCount, page]] of expected) {
    const position = dataset.positions.find((item) => item.year === 2026 && item.code === code);
    assert.ok(position, `${code} should resolve to a local 2026 position`);
    assert.equal(position.districtId, 'pinggu');
    assert.equal(position.recruitCount, recruitCount);

    const row = rows.find((item) => item.positionCode === code);
    assert.ok(row, `${code} should have a linked third-party application reference`);
    assert.equal(row.sourceId, `pinggu-2026-fenbi-page-${page}`);
    assert.equal(row.applicantsRegistered, applicantsRegistered);
    assert.equal(row.applicantsQualified, null);
    assert.equal(row.observedAt, null);
    assert.equal(getPositionCompetitionEvidence(position, dataset).registeredCompetitionRatio,
      applicantsRegistered / recruitCount);
  }

  assert.equal(rows.some((row) => row.positionCode === '241369303'), false,
    'two same-title market-supervision rows must not be guessed onto one local code');
});

test('Pinggu positions can be sorted by their linked per-slot application references', () => {
  const positions = dataset.positions.filter((position) => position.year === 2026 && position.districtId === 'pinggu');
  const sorted = filterAndSortPositions(positions, {
    observations: dataset.observations,
    scoreRows: dataset.scoreRows,
    sortBy: 'registration-desc',
  });

  assert.deepEqual(sorted.slice(0, 3).map((position) => position.code), ['821369003', '241370902', '241371203']);
});
