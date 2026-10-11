import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { normalizeDataset } from '../src/data/normalize.js';
import { filterAndSortPositions, getPositionCompetitionEvidence } from '../src/data/positions.js';

const raw = JSON.parse(await readFile(new URL('../public/data.json', import.meta.url), 'utf8'));
const dataset = normalizeDataset(raw);

const expectedPages = {
  'yanqing-2026-fenbi-page-2': [
    ['821778201', 23, 2],
    ['221778301', 30, 2],
    ['221778401', 13, 1],
    ['821778601', 25, 2],
    ['821778701', 135, 2],
    ['821778702', 14, 1],
    ['221778801', 6, 2],
    ['821778901', 27, 2],
    ['221778902', 1, 1],
  ],
  'yanqing-2026-fenbi-page-3': [
    ['221779001', 29, 1],
    ['221779002', 5, 2],
    ['221779101', 7, 4],
    ['821779103', 4, 2],
    ['221779201', 15, 1],
    ['221779202', 5, 1],
    ['221779301', 4, 2],
    ['221779302', 18, 2],
    ['241779502', 63, 4],
    ['241779503', 37, 4],
  ],
  'yanqing-2026-fenbi-page-4': [
    ['221779601', 38, 2],
    ['221779701', 0, 1],
    ['221779801', 5, 1],
    ['821779901', 18, 2],
    ['821779903', 7, 2],
    ['241780201', 7, 2],
  ],
  'yanqing-2026-fenbi-page-5': [
    ['241780501', 63, 1],
    ['241780601', 145, 1],
    ['221779102', 2, 2],
    ['821779401', 3, 1],
    ['221779501', 1, 1],
    ['241780602', 9, 1],
    ['241780801', 4, 1],
    ['821779902', 0, 1],
  ],
};

test('Yanqing Fenbi pages 2–5 link only uniquely matched rows to local 2026 positions', () => {
  let linkedRows = 0;
  for (const [sourceId, expected] of Object.entries(expectedPages)) {
    const source = dataset.sources.find((item) => item.sourceId === sourceId);
    assert.ok(source, `${sourceId} should be registered`);
    assert.equal(source.url, `https://m.fenbi.com/page/positions/1/438923?page=${sourceId.at(-1)}&region=178`);
    assert.deepEqual(source.positionSnapshots.map((item) => [
      item.positionCode,
      item.applicantsRegistered,
      item.recruitCount,
    ]), expected);
    linkedRows += expected.length;

    for (const [code] of expected) {
      const position = dataset.positions.find((item) => item.year === 2026 && item.code === code);
      assert.ok(position, `${code} should resolve to a local position`);
      assert.equal(position.districtId, 'yanqing');
    }
  }
  assert.equal(linkedRows, 33);
});

test('Yanqing role details and filters expose the linked third-party references separately from dated snapshots', () => {
  const position = dataset.positions.find((item) => item.year === 2026 && item.code === '821778701');
  assert.ok(position, 'the mediation/arbitration role should resolve locally');
  const evidence = getPositionCompetitionEvidence(position, dataset);
  assert.equal(evidence.registeredCompetitionRatio, 67.5);
  assert.equal(evidence.latestRegistrationSnapshot.applicantsRegistered, 135);
  assert.equal(evidence.latestRegistrationSnapshot.observedAt, null);
  assert.deepEqual(evidence.registrationSourceIds, ['yanqing-2026-fenbi-page-2']);

  const registered = filterAndSortPositions(dataset.positions, {
    districtId: 'yanqing',
    year: '2026',
    competitionEvidence: 'has',
    observations: dataset.observations,
    scoreRows: dataset.scoreRows,
    sortBy: 'registration-desc',
  });
  assert.ok(registered.some((item) => item.code === position.code));

  const yanqing2026 = dataset.positions.filter((item) => item.year === 2026 && item.districtId === 'yanqing');
  const pageReferences = yanqing2026.filter((item) => getPositionCompetitionEvidence(item, dataset)
    .registrationSourceIds.some((sourceId) => sourceId.startsWith('yanqing-2026-fenbi-page-')));
  const linkedCutoffs = yanqing2026.filter((item) => getPositionCompetitionEvidence(item, dataset).cutoffScore !== null);
  assert.equal(pageReferences.length, 43);
  assert.equal(linkedCutoffs.length, 21);
  assert.ok(linkedCutoffs.every((item) => getPositionCompetitionEvidence(item, dataset).registrationSourceIds
    .some((sourceId) => sourceId.startsWith('yanqing-2026-fenbi-page-'))));
  for (const code of ['241780301', '241780302']) {
    const ambiguous = yanqing2026.find((item) => item.code === code);
    assert.equal(getPositionCompetitionEvidence(ambiguous, dataset).cutoffScore, null);
    assert.ok(getPositionCompetitionEvidence(ambiguous, dataset).ambiguousCutoffRows.length > 0);
  }
});
