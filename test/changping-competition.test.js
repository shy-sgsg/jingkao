import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { normalizeDataset } from '../src/data/normalize.js';
import { filterAndSortPositions, getPositionCompetitionEvidence } from '../src/data/positions.js';

const raw = JSON.parse(await readFile(new URL('../public/data.json', import.meta.url), 'utf8'));
const dataset = normalizeDataset(raw);

const expectedPages = {
  'changping-2026-fenbi-page-2': [
    ['821261001', 29, 2],
    ['821261102', 615, 2],
    ['221261201', 36, 2],
    ['221261301', 37, 2],
    ['821261401', 107, 1],
    ['821261402', 22, 2],
    ['821261501', 42, 2],
    ['821261502', 28, 2],
    ['821261503', 25, 2],
    ['221261601', 48, 2],
  ],
  'changping-2026-fenbi-page-3': [
    ['221261701', 29, 1],
    ['821261703', 20, 2],
    ['221261702', 38, 1],
    ['221261801', 32, 1],
    ['221261802', 5, 1],
    ['221261803', 66, 2],
    ['221261901', 5, 1],
    ['221261902', 2, 2],
    ['821262001', 40, 2],
    ['221262101', 54, 2],
  ],
  'changping-2026-fenbi-page-4': [
    ['221262102', 27, 2],
    ['221262201', 32, 1],
    ['221262301', 12, 2],
    ['221262401', 16, 2],
    ['221262501', 10, 2],
    ['231262503', 2, 1],
  ],
  'changping-2026-fenbi-page-5': [
    ['221262601', 74, 1],
    ['221262701', 14, 1],
    ['821262702', 22, 2],
    ['821263001', 261, 1],
    ['821263101', 53, 2],
    ['231263201', 16, 2],
    ['231263301', 7, 2],
    ['231263302', 3, 1],
  ],
  'changping-2026-fenbi-page-6': [
    ['231263501', 5, 1],
    ['231263601', 3, 2],
    ['231263701', 31, 1],
    ['231263702', 3, 1],
    ['231263703', 16, 1],
    ['231263901', 2, 1],
    ['231263902', 14, 1],
    ['231263904', 26, 2],
    ['231264002', 5, 2],
  ],
  'changping-2026-fenbi-page-7': [
    ['241264101', 18, 2],
    ['241264202', 5, 1],
    ['241264701', 13, 1],
    ['231264801', 0, 1],
    ['231264802', 24, 1],
    ['241264902', 63, 1],
    ['526012903', 0, 1],
    ['821261101', 3, 1],
  ],
  'changping-2026-fenbi-page-8': [
    ['221261804', 3, 1],
    ['231263801', 0, 1],
    ['231263802', 1, 1],
    ['231263903', 2, 1],
    ['231264401', 3, 1],
    ['231264001', 8, 1],
    ['241264201', 8, 1],
    ['231264301', 9, 1],
    ['231264501', 10, 1],
  ],
};

test('Changping Fenbi pages 2–8 link only uniquely matched rows to local 2026 positions', () => {
  let linkedRows = 0;
  for (const [sourceId, expected] of Object.entries(expectedPages)) {
    const source = dataset.sources.find((item) => item.sourceId === sourceId);
    assert.ok(source, `${sourceId} should be registered`);
    assert.equal(source.url, `https://m.fenbi.com/page/positions/1/438923?page=${sourceId.at(-1)}&region=161`);

    const actual = source.positionSnapshots.map((item) => [
      item.positionCode,
      item.applicantsRegistered,
      item.recruitCount,
    ]);
    assert.deepEqual(actual, expected);
    linkedRows += actual.length;

    for (const [code] of expected) {
      const position = dataset.positions.find((item) => item.year === 2026 && item.code === code);
      assert.ok(position, `${code} should resolve to a local position`);
      assert.equal(position.districtId, 'changping');
    }
  }
  assert.equal(linkedRows, 60);
});

test('Changping job detail keeps the page reference separate from dated qualification snapshots and ambiguous cutoff', () => {
  const position = dataset.positions.find((item) => item.year === 2026 && item.code === '821261102');
  assert.ok(position, 'the archive role should resolve locally');

  const evidence = getPositionCompetitionEvidence(position, dataset);
  assert.equal(evidence.registeredCompetitionRatio, 307.5);
  assert.equal(evidence.qualifiedCompetitionRatio, 307.5);
  assert.equal(evidence.latestRegistrationSnapshot.applicantsRegistered, 615);
  assert.equal(evidence.latestRegistrationSnapshot.observedAt, null);
  assert.equal(evidence.latestSnapshot.observedAt, '2025-11-21 09:00');
  assert.deepEqual(evidence.registrationSourceIds, ['changping-2026-fenbi-page-2']);
  assert.equal(evidence.cutoffScore, null);
  assert.equal(evidence.ambiguousCutoffRows.length, 1);
});

test('Changping competition and cutoff evidence can be filtered and sorted by position', () => {
  const registered = filterAndSortPositions(dataset.positions, {
    districtId: 'changping',
    year: '2026',
    competitionEvidence: 'has',
    observations: dataset.observations,
    scoreRows: dataset.scoreRows,
    sortBy: 'registration-desc',
  });
  assert.equal(registered.length, 70); // Includes one existing qualification-only police snapshot.
  assert.equal(registered.filter((position) => getPositionCompetitionEvidence(position, dataset).registrationSourceIds
    .some((sourceId) => sourceId.startsWith('changping-2026-fenbi-page-'))).length, 69);
  assert.equal(registered[0].code, '821261102');

  const withCutoffs = filterAndSortPositions(dataset.positions, {
    districtId: 'changping',
    year: '2026',
    competitionEvidence: 'has',
    cutoffEvidence: 'has',
    observations: dataset.observations,
    scoreRows: dataset.scoreRows,
    sortBy: 'registration-desc',
  });
  assert.equal(withCutoffs.length, 26);
  assert.ok(withCutoffs.every((position) => getPositionCompetitionEvidence(position, dataset).cutoffScore !== null));
});
