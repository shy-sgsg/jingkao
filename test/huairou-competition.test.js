import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { normalizeDataset } from '../src/data/normalize.js';
import { getPositionCompetitionEvidence } from '../src/data/positions.js';

const raw = JSON.parse(await readFile(new URL('../public/data.json', import.meta.url), 'utf8'));
const dataset = normalizeDataset(raw);

const expectedPages = {
  'huairou-2026-fenbi-page-2': [
    ['241672503', 23, 2],
    ['241672504', 8, 2],
    ['221672505', 9, 2],
    ['221672601', 16, 2],
    ['221672701', 19, 2],
    ['821672702', 12, 2],
    ['221672801', 34, 2],
    ['221672802', 21, 2],
    ['821672902', 7, 2],
  ],
  'huairou-2026-fenbi-page-3': [
    ['221673001', 20, 2],
    ['821673101', 17, 2],
    ['821673201', 16, 2],
    ['221673301', 6, 2],
    ['221673401', 1, 1],
    ['221673501', 15, 4],
    ['221673601', 12, 2],
    ['821673701', 81, 2],
    ['821673702', 18, 2],
    ['241673801', 14, 1],
  ],
  'huairou-2026-fenbi-page-4': [
    ['241674001', 15, 2],
    ['241673802', 11, 1],
    ['241674301', 4, 1],
    ['241674101', 4, 1],
  ],
};

test('Huairou page-level applicant references link only unique local position entries', () => {
  for (const [sourceId, expected] of Object.entries(expectedPages)) {
    const source = dataset.sources.find((item) => item.sourceId === sourceId);
    assert.ok(source, `${sourceId} should be registered`);

    const actual = source.positionSnapshots.map((item) => [
      item.positionCode,
      item.applicantsRegistered,
      item.recruitCount,
    ]);
    assert.deepEqual(actual, expected);

    for (const [code] of expected) {
      const position = dataset.positions.find((item) => item.year === 2026 && item.code === code);
      assert.ok(position, `${code} should resolve to a local position entry`);
      assert.equal(position.districtId, 'huairou');
    }
  }
});

test('Huairou job detail combines its page reference with the linked lowest interview cutoff', () => {
  const position = dataset.positions.find((item) => item.year === 2026 && item.code === '821673701');
  assert.ok(position, 'the city command-center petition-handling job should resolve locally');

  const evidence = getPositionCompetitionEvidence(position, dataset);
  assert.equal(evidence.registeredCompetitionRatio, 40.5);
  assert.equal(evidence.cutoffScore, 121);
  assert.deepEqual(evidence.registrationSourceIds, ['huairou-2026-fenbi-page-3']);
  assert.deepEqual(evidence.cutoffSourceIds, ['cgzj-2026-huairou-cutoff-sample']);
});
