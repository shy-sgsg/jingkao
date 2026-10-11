import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { filterAndSortPositions, getPositionCompetitionEvidence } from '../src/data/positions.js';

const dataset = JSON.parse(await readFile(new URL('../public/data.json', import.meta.url), 'utf8'));

const expected = new Map([
  ['121566701', [2, 2, 2]],
  ['121566703', [2, 2, 2]],
  ['221565101', [1, 23, 3]],
  ['221565102', [1, 39, 3]],
  ['821565301', [2, 65, 3]],
  ['821565304', [2, 7, 3]],
  ['821565801', [1, 15, 4]],
  ['231566901', [1, 67, 6]],
  ['231567001', [1, 16, 6]],
  ['231567301', [2, 22, 7]],
  ['231567402', [1, 18, 7]],
  ['231567501', [2, 9, 7]],
  ['821566201', [4, 56, 5]],
  ['821566202', [2, 53, 5]],
  ['221566401', [1, 19, 5]],
  ['221565201', [2, 58, 3]],
  ['821565202', [2, 145, 3]],
  ['221565203', [2, 43, 3]],
  ['526013001', [8, 30, 2]],
  ['625015101', [2, 1, 2]],
  ['625015103', [4, 11, 2]],
  ['625015102', [2, 9, 2]],
  ['821565001', [1, 12, 3]],
  ['221565401', [2, 25, 3]],
  ['821566601', [1, 9, 6]],
  ['231567102', [1, 14, 6]],
  ['231567101', [1, 20, 9]],
  ['231567701', [1, 43, 7]],
  ['231567702', [1, 37, 7]],
  ['231567704', [1, 6, 7]],
  ['231567705', [2, 6, 7]],
  ['231568101', [1, 19, 8]],
  ['231568301', [2, 107, 8]],
  ['231568401', [1, 22, 8]],
  ['231568001', [2, 17, 8]],
  ['231568002', [2, 16, 8]],
  ['821565601', [1, 14, 4]],
  ['821565604', [1, 6, 4]],
  ['239910901', [1, 10, 2]],
  ['231567703', [1, 5, 9]],
]);

test('Daxing Fenbi registration references link by exact code and preserve each page source separately from qualified applicants', () => {
  const sourceIds = new Set([...expected.values()].map(([, , page]) => `daxing-2026-fenbi-page-${page}`));
  for (const sourceId of sourceIds) {
    assert.ok(dataset.sources.some((item) => item.sourceId === sourceId), `${sourceId} should be cited`);
  }

  const rows = dataset.observations.filter((item) => sourceIds.has(item.sourceId));
  assert.equal(rows.length, expected.size);

  for (const [code, [recruitCount, applicantsRegistered, page]] of expected) {
    const position = dataset.positions.find((item) => item.year === 2026 && item.code === code);
    assert.ok(position, `${code} should resolve to an existing position`);
    const row = rows.find((item) => item.positionCode === code);
    assert.ok(row, `${code} should have its source count linked`);
    assert.equal(row.sourceId, `daxing-2026-fenbi-page-${page}`, `${code} should cite the page where it appears`);
    assert.equal(position.recruitCount, recruitCount, `${code} local plan count`);
    assert.equal(row.recruitCount, recruitCount, `${code} source plan count`);
    assert.equal(row.applicantsRegistered, applicantsRegistered, `${code} reported applicant count`);
    assert.equal(row.applicantsQualified, null, `${code} must not be reclassified as qualified applicants`);
    assert.equal(row.observedAt, null, `${code} must not be given an invented observation time`);
    assert.equal(getPositionCompetitionEvidence(position, dataset).registeredCompetitionRatio,
      applicantsRegistered / recruitCount, `${code} should be filterable by its reported count per plan slot`);
  }

  assert.equal(rows.some((item) => item.positionCode === '232502901'), false,
    'the Daxing public-security post absent from this district list must not be force-matched');

  const daxingPositions = dataset.positions.filter((item) => item.year === 2026 && item.districtId === 'daxing');
  const sorted = filterAndSortPositions(daxingPositions, {
    observations: dataset.observations,
    scoreRows: dataset.scoreRows,
    sortBy: 'registration-desc',
  });
  assert.deepEqual(sorted.slice(0, 3).map((item) => item.code), ['821565202', '231566901', '231568301']);
});
