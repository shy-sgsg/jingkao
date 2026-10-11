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
