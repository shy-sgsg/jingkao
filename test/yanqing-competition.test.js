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
  assert.equal(linkedCutoffs.length, 22);
  assert.ok(linkedCutoffs.every((item) => getPositionCompetitionEvidence(item, dataset).registrationSourceIds
    .some((sourceId) => sourceId.startsWith('yanqing-2026-fenbi-page-'))));
  for (const code of ['241780301', '241780302']) {
    const ambiguous = yanqing2026.find((item) => item.code === code);
    assert.equal(getPositionCompetitionEvidence(ambiguous, dataset).cutoffScore, null);
    assert.ok(getPositionCompetitionEvidence(ambiguous, dataset).ambiguousCutoffRows.length > 0);
  }
});

test('Yanqing 2026 roles expose dated qualification snapshots independently from undated Fenbi references', () => {
  const fourSeas = dataset.positions.find((item) => item.year === 2026 && item.code === '241780601');
  const fourSeasEvidence = getPositionCompetitionEvidence(fourSeas, dataset);
  assert.deepEqual(fourSeasEvidence.snapshots.map((item) => [
    item.sourceId,
    item.observedAt,
    item.applicantsQualified,
    item.recruitCount,
  ]), [
    ['eoffcn-2026-snapshot-20251117-1800', '2025-11-17 18:00', 28, 1],
    ['eoffcn-2026-snapshot-20251118-0900', '2025-11-18 09:00', 28, 1],
    ['eoffcn-2026-snapshot-20251118-1800', '2025-11-18 18:00', 51, 1],
    ['eoffcn-2026-snapshot-20251119-0900', '2025-11-19 09:00', 51, 1],
    ['eoffcn-2026-snapshot-20251119-1800', '2025-11-19 18:00', 87, 1],
  ]);
  assert.equal(fourSeasEvidence.qualifiedCompetitionRatio, 87);
  assert.equal(fourSeasEvidence.registeredCompetitionRatio, 145);
  assert.equal(fourSeasEvidence.latestRegistrationSnapshot.observedAt, null);

  const police = dataset.positions.find((item) => item.year === 2026 && item.code === '242503301');
  const policeEvidence = getPositionCompetitionEvidence(police, dataset);
  assert.equal(policeEvidence.snapshots.length, 1);
  assert.equal(policeEvidence.snapshots[0].sourceId, 'eoffcn-2026-snapshot-20251118-0900');
  assert.equal(policeEvidence.snapshots[0].applicantsQualified, 51);
  assert.equal(policeEvidence.qualifiedCompetitionRatio, 51 / 18);

  const filtered = filterAndSortPositions(dataset.positions, {
    districtId: 'yanqing',
    year: '2026',
    competitionEvidence: 'has',
    observations: dataset.observations,
    scoreRows: dataset.scoreRows,
    sortBy: 'qualification-desc',
  });
  assert.ok(filtered.some((item) => item.code === fourSeas.code));
  assert.ok(filtered.some((item) => item.code === police.code));
});

test('Yanqing 2024 final-day qualification leaderboard links exact position codes and preserves its denominator', () => {
  const sourceId = 'offcn-2024-yanqing-final-20231117-0900';
  const expected = [
    ['241774602', 90, 2, 45],
    ['241775401', 30, 1, 30],
    ['221773801', 28, 1, 28],
    ['821772603', 26, 1, 26],
    ['241774604', 26, 1, 26],
    ['221772701', 25, 1, 25],
    ['241773403', 90, 4, 22.5],
    ['221772202', 21, 1, 21],
    ['221772301', 21, 1, 21],
    ['241775002', 40, 2, 20],
  ];
  const source = dataset.sources.find((item) => item.sourceId === sourceId);
  assert.equal(source?.url, 'https://zw.admin.offcn.com/zwcx/lnblb/14894/52/');
  assert.equal(source?.level, 'secondary');
  assert.equal(source?.observedAt, '2023-11-17 09:00');
  assert.equal(source?.positionSnapshots.length, expected.length);

  for (const [code, qualified, recruits, ratio] of expected) {
    const position = dataset.positions.find((item) => Number(item.year) === 2024 && item.code === code);
    const observation = dataset.observations.find((item) => item.sourceId === sourceId
      && Number(item.year) === 2024 && item.positionCode === code);
    assert.ok(position, `${code} should resolve to an exact 2024 position`);
    assert.equal(position.districtId, 'yanqing');
    assert.equal(position.recruitCount, recruits);
    assert.equal(observation?.scope, 'position-level');
    assert.equal(observation?.observationType, 'qualified_snapshot');
    assert.equal(observation?.observedAt, '2023-11-17 09:00');
    assert.equal(observation?.applicantsRegistered, null);
    assert.equal(observation?.applicantsQualified, qualified);
    assert.equal(observation?.qualifiedCompetitionRatio, ratio);
    assert.ok(getPositionCompetitionEvidence(position, dataset).snapshots.includes(observation));
  }

  const filtered = filterAndSortPositions(dataset.positions, {
    districtId: 'yanqing',
    year: 2024,
    competitionEvidence: 'has',
    observations: dataset.observations,
    scoreRows: dataset.scoreRows,
    sortBy: 'qualification-desc',
  });
  assert.ok(expected.every(([code]) => filtered.some((item) => item.code === code)));
});
