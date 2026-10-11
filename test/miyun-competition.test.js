import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { normalizeDataset } from '../src/data/normalize.js';
import { getPositionCompetitionEvidence } from '../src/data/positions.js';

test('Miyun registration snapshot and visible 2026 interview cutoffs link only verified position identities', async () => {
  const raw = JSON.parse(await readFile(new URL('../public/data.json', import.meta.url), 'utf8'));
  const data = normalizeDataset(raw);
  const snapshotSourceId = 'eoffcn-2026-snapshot-20251118-0900';
  const cutoffSourceId = 'cgzj-2026-miyun-cutoff-sample';

  const policePosition = data.positions.find((row) => row.year === 2026 && row.code === '242503201');
  assert.equal(policePosition?.unit, '北京市公安局密云分局');
  assert.equal(policePosition?.title, '一线执法岗1');
  assert.equal(policePosition?.recruitCount, 17);
  assert.equal(policePosition?.districtId, 'miyun');

  const registration = data.observations.find((row) => row.year === 2026
    && row.positionCode === '242503201' && row.sourceId === snapshotSourceId);
  assert.equal(registration?.observedAt, '2025-11-18 09:00');
  assert.equal(registration?.applicantsQualified, 42);
  assert.equal(registration?.recruitCount, 17);
  assert.equal(registration?.qualifiedCompetitionRatio, 42 / 17);
  assert.equal(registration?.applicantsRegistered, null);
  assert.equal(registration?.applicantsPaid, null);

  const expectedLinkedCutoffs = [
    ['121874401', 122.75],
    ['221875501', 121],
    ['241877401', 122.75],
    ['121876701', 123.5],
    ['121876702', 122.75],
    ['241877801', 122],
    ['241877002', 102.5],
    ['221875201', 120.25],
    ['241878002', 119.75],
    ['221874901', 140.25],
    ['221874801', 132],
    ['221875101', 130.25],
    ['821874601', 130],
    ['221876401', 129.25],
    ['221875301', 128.5],
    ['821875303', 127],
    ['241876102', 127],
    ['241876801', 127],
    ['526013304', 123.25],
    ['821874501', 123.25],
    ['241877701', 122.25],
    ['526013301', 120.75],
    ['221875801', 120.25],
    ['221875902', 119.75],
  ];

  for (const [code, score] of expectedLinkedCutoffs) {
    const position = data.positions.find((row) => row.year === 2026 && row.code === code);
    assert.ok(position, `${code} position must be available for filtering`);
    const matches = data.scoreRows.filter((row) => row.year === 2026
      && row.sourceId === cutoffSourceId && row.positionCode === code);
    assert.equal(matches.length, 1, `${code} should have one position-linked cutoff`);
    assert.equal(matches[0].score, score);
    assert.equal(matches[0].mappingConfidence, 'high');

    const evidence = getPositionCompetitionEvidence(position, {
      observations: data.observations,
      scoreRows: data.scoreRows,
    });
    assert.equal(evidence.cutoffScore, score);
  }

  const ambiguousCutoffs = [
    ['北京市密云区市场监督管理局', '综合管理岗', 130.75, ['221876101', '241876104']],
    ['北京市密云区住房和城乡建设委员会', '综合管理岗', 126, ['221875601', '221875602']],
    ['北京市密云区市场监督管理局', '综合管理岗', 97, ['221876101', '241876104']],
    ['北京市密云区东邵渠镇', '综合管理岗', 95, ['241877201', '241877202']],
  ];

  for (const [unit, title, score, candidateCodes] of ambiguousCutoffs) {
    const row = data.scoreRows.find((item) => item.year === 2026 && item.sourceId === cutoffSourceId
      && item.unit === unit && item.title === title && item.score === score);
    assert.ok(row, `${unit} ${title} ${score} should remain in the sample`);
    assert.equal(row.positionCode, null);
    assert.equal(row.mappingConfidence, 'ambiguous');
    assert.deepEqual(data.positions.filter((position) => position.year === 2026
      && position.unit === unit && position.title === title).map((position) => position.code).sort(), candidateCodes);
  }

  const sample = data.scoreSamples.find((row) => row.sourceId === cutoffSourceId);
  const cutoffRows = data.scoreRows.filter((row) => row.year === 2026 && row.sourceId === cutoffSourceId);
  assert.equal(sample?.samplePositions, 28);
  assert.deepEqual([sample?.minimum, sample?.maximum], [95, 140.25]);
  assert.equal(cutoffRows.length, 28);
  assert.equal(cutoffRows.filter((row) => row.mappingConfidence === 'high' && row.positionCode).length, 24);
  assert.equal(cutoffRows.filter((row) => row.mappingConfidence === 'ambiguous' && !row.positionCode).length, 4);
  assert.equal(cutoffRows.filter((row) => row.mappingConfidence === 'unmatched' && !row.positionCode).length, 0);
});

test('Miyun Fenbi pages 2-7 and the citywide police row link competition references to all local positions', async () => {
  const raw = JSON.parse(await readFile(new URL('../public/data.json', import.meta.url), 'utf8'));
  const data = normalizeDataset(raw);
  const expectedByPage = {
    2: [
      ['221874801', 134, 1], ['221874901', 27, 1], ['221875101', 37, 1],
      ['221875201', 12, 1], ['221875301', 26, 2], ['821875303', 9, 1],
    ],
    3: [['221875501', 10, 2], ['221875601', 3, 1], ['221875602', 14, 1], ['221875902', 28, 1]],
    4: [['221876101', 11, 2], ['241876102', 16, 2], ['221876401', 113, 1], ['241876801', 55, 1]],
    5: [['241877002', 98, 2], ['241877202', 17, 2], ['241877401', 23, 1], ['241877701', 72, 1]],
    6: [['241877801', 76, 1], ['241878002', 32, 1], ['241876104', 12, 2], ['221875801', 4, 1]],
    7: [['241877201', 2, 1]],
  };

  let applicantsTotal = 0;
  let recruitsTotal = 0;
  let importedCount = 0;
  for (const [page, rows] of Object.entries(expectedByPage)) {
    const sourceId = `miyun-2026-fenbi-page-${page}`;
    const source = data.sources.find((item) => item.sourceId === sourceId);
    assert.ok(source, `${sourceId} source exists`);
    assert.match(source.url, new RegExp(`page=${page}&region=170`));
    assert.equal(source.districtId, 'miyun');

    for (const [code, applicants, recruits] of rows) {
      importedCount += 1;
      applicantsTotal += applicants;
      recruitsTotal += recruits;
      const position = data.positions.find((row) => row.year === 2026 && row.code === code);
      assert.ok(position, `position ${code} exists`);
      assert.equal(position.districtId, 'miyun', `${code} district`);
      assert.equal(position.recruitCount, recruits, `${code} planned recruits`);
      const observation = data.observations.find((row) => row.year === 2026
        && row.positionCode === code && row.sourceId === sourceId);
      assert.equal(observation?.observationType, 'registration_snapshot');
      assert.equal(observation?.applicantsRegistered, applicants);
      assert.equal(observation?.applicantsQualified, null);
      assert.equal(observation?.observedAt, null);

      const evidence = getPositionCompetitionEvidence(position, {
        observations: data.observations,
        scoreRows: data.scoreRows,
      });
      assert.equal(evidence.registeredCompetitionRatio, applicants / recruits);
      assert.ok(evidence.registrationSourceIds.includes(sourceId));
    }
  }

  assert.equal(importedCount, 23);
  assert.equal(applicantsTotal, 831);
  assert.equal(recruitsTotal, 30);

  const policeSource = data.sources.find((item) => item.sourceId === 'miyun-2026-fenbi-police-page-9');
  assert.ok(policeSource);
  assert.match(policeSource.url, /page=9&quickPick=/);
  assert.equal(policeSource.districtId, 'miyun');
  const policePosition = data.positions.find((row) => row.year === 2026 && row.code === '242503201');
  const policeEvidence = getPositionCompetitionEvidence(policePosition, {
    observations: data.observations,
    scoreRows: data.scoreRows,
  });
  assert.equal(policeEvidence.registeredCompetitionRatio, 324 / 17);
  assert.equal(policeEvidence.qualifiedCompetitionRatio, 42 / 17);
  assert.ok(policeEvidence.registrationSourceIds.includes('miyun-2026-fenbi-police-page-9'));

  const positions = data.positions.filter((row) => row.year === 2026 && row.districtId === 'miyun');
  const evidenceRows = positions.map((position) => getPositionCompetitionEvidence(position, {
    observations: data.observations,
    scoreRows: data.scoreRows,
  }));
  assert.equal(positions.length, 31);
  assert.ok(evidenceRows.every((item) => item.registeredCompetitionRatio !== null));
  assert.equal(evidenceRows.filter((item) => item.cutoffScore !== null).length, 24);
  assert.equal(evidenceRows.filter((item) => item.cutoffScore !== null && item.registeredCompetitionRatio !== null).length, 24);
});
