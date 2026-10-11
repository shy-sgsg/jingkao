import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { normalizeDataset } from '../src/data/normalize.js';
import { getPositionCompetitionEvidence } from '../src/data/positions.js';

test('Fengtai 2026 reported applicant counts link to exact positions without implying official qualification counts', async () => {
  const raw = JSON.parse(await readFile(new URL('../public/data.json', import.meta.url), 'utf8'));
  const dataset = normalizeDataset(raw);
  const pages = dataset.sources.filter((source) => /^fengtai-2026-fenbi-page-(?:[1-5]|10)$/.test(source.sourceId));
  const snapshots = pages.flatMap((source) => (source.positionSnapshots || []).map((snapshot) => ({
    ...snapshot,
    sourceId: source.sourceId,
  })));
  const expected = [
    ['fengtai-2026-fenbi-page-1', '526012301', 45, 12],
    ['fengtai-2026-fenbi-page-1', '526012302', 1, 1],
    ['fengtai-2026-fenbi-page-1', '625014401', 18, 6],
    ['fengtai-2026-fenbi-page-1', '625014402', 15, 4],
    ['fengtai-2026-fenbi-page-1', '625014403', 1, 2],
    ['fengtai-2026-fenbi-page-1', '120738901', 17, 1],
    ['fengtai-2026-fenbi-page-2', '820739401', 13, 1],
    ['fengtai-2026-fenbi-page-2', '820739402', 26, 2],
    ['fengtai-2026-fenbi-page-2', '220739403', 19, 2],
    ['fengtai-2026-fenbi-page-2', '820739501', 15, 2],
    ['fengtai-2026-fenbi-page-2', '820739502', 10, 2],
    ['fengtai-2026-fenbi-page-2', '820739503', 6, 1],
    ['fengtai-2026-fenbi-page-2', '820739504', 3, 1],
    ['fengtai-2026-fenbi-page-3', '820739505', 44, 2],
    ['fengtai-2026-fenbi-page-4', '220740302', 37, 4],
    ['fengtai-2026-fenbi-page-4', '220740303', 53, 4],
    ['fengtai-2026-fenbi-page-4', '220740304', 21, 2],
    ['fengtai-2026-fenbi-page-4', '220740305', 12, 2],
    ['fengtai-2026-fenbi-page-4', '220740306', 51, 2],
    ['fengtai-2026-fenbi-page-4', '220740307', 14, 2],
    ['fengtai-2026-fenbi-page-4', '230740308', 1, 1],
    ['fengtai-2026-fenbi-page-4', '230740309', 20, 2],
    ['fengtai-2026-fenbi-page-4', '230740310', 21, 2],
    ['fengtai-2026-fenbi-page-4', '230740312', 44, 1],
    ['fengtai-2026-fenbi-page-5', '820740401', 23, 2],
    ['fengtai-2026-fenbi-page-5', '220740501', 23, 1],
    ['fengtai-2026-fenbi-page-5', '820740601', 111, 2],
    ['fengtai-2026-fenbi-page-5', '820740801', 26, 2],
    ['fengtai-2026-fenbi-page-5', '820740901', 42, 2],
    ['fengtai-2026-fenbi-page-5', '820741001', 36, 2],
    ['fengtai-2026-fenbi-page-5', '820741002', 22, 2],
    ['fengtai-2026-fenbi-page-5', '820741101', 13, 1],
    ['fengtai-2026-fenbi-page-5', '220741301', 24, 1],
    ['fengtai-2026-fenbi-page-5', '230741401', 2, 1],
    ['fengtai-2026-fenbi-page-10', '230742504', 2, 1],
    ['fengtai-2026-fenbi-page-10', '230742801', 2, 1],
    ['fengtai-2026-fenbi-page-10', '230743202', 2, 1],
    ['fengtai-2026-fenbi-page-10', '230741903', 5, 1],
    ['fengtai-2026-fenbi-page-10', '230743201', 2, 1],
    ['fengtai-2026-fenbi-page-10', '230740313', 25, 1],
  ];

  assert.equal(pages.length, 6);
  assert.equal(snapshots.length, 40);
  assert.equal(new Set(snapshots.map((row) => row.positionCode)).size, expected.length);

  for (const [sourceId, code, applicants, recruits] of expected) {
    const snapshot = snapshots.find((row) => row.sourceId === sourceId && row.positionCode === code);
    assert.equal(snapshot?.applicantsRegistered, applicants, `${code} reported applicant count`);
    assert.equal(snapshot?.recruitCount, recruits, `${code} planned recruits`);
    const position = dataset.positions.find((item) => item.year === 2026 && item.code === code);
    assert.ok(position, `position ${code} exists`);
    assert.equal(position.districtId, 'fengtai', `${code} district`);
    assert.equal(position.recruitCount, recruits, `${code} position recruit count`);
    const observation = dataset.observations.find((item) => item.year === 2026
      && item.positionCode === code && item.sourceId === sourceId);
    assert.equal(observation?.observationType, 'registration_snapshot', `${code} remains a third-party reported-count reference`);
    assert.equal(observation?.applicantsRegistered, applicants, `${code} retains the source field`);
    assert.equal(observation?.applicantsQualified, null, `${code} is not relabeled as an official qualification count`);
    assert.equal(observation?.observedAt, null, `${code} has no reported snapshot timestamp`);
    const evidence = getPositionCompetitionEvidence(position, {
      observations: dataset.observations,
      scoreRows: dataset.scoreRows,
    });
    assert.equal(evidence.registeredCompetitionRatio, applicants / recruits, `${code} reported-count ratio`);
  }
});

test('Fengtai Shiliuzhuang position combines its reported registration ratio and linked interview cutoff', async () => {
  const raw = JSON.parse(await readFile(new URL('../public/data.json', import.meta.url), 'utf8'));
  const dataset = normalizeDataset(raw);
  const position = dataset.positions.find((item) => item.year === 2026 && item.code === '230742504');
  const evidence = getPositionCompetitionEvidence(position, {
    observations: dataset.observations,
    scoreRows: dataset.scoreRows,
  });

  assert.ok(position);
  assert.equal(evidence.registeredCompetitionRatio, 2);
  assert.equal(evidence.cutoffScore, 104.5);
  assert.deepEqual(evidence.cutoffSourceIds, ['cgzj-2026-street-cutoff-sample']);
});

test('Fengtai police jobs on citywide Fenbi pages link applicant, qualified, and interview-cutoff evidence separately', async () => {
  const raw = JSON.parse(await readFile(new URL('../public/data.json', import.meta.url), 'utf8'));
  const dataset = normalizeDataset(raw);
  const expected = [
    ['fengtai-2026-fenbi-police-page-6', '232502201', 300, 22],
    ['fengtai-2026-fenbi-police-page-6', '232502202', 24, 3],
    ['fengtai-2026-fenbi-police-page-7', '232502203', 30, 10],
    ['fengtai-2026-fenbi-police-page-7', '232502204', 23, 5],
  ];

  for (const [sourceId, code, applicants, recruits] of expected) {
    const source = dataset.sources.find((item) => item.sourceId === sourceId);
    assert.ok(source, `${sourceId} source exists`);
    assert.match(source.url, new RegExp(`page=${sourceId.endsWith('6') ? 6 : 7}`));
    assert.equal(source.districtId, 'fengtai');
    const position = dataset.positions.find((item) => item.year === 2026 && item.code === code);
    assert.ok(position, `position ${code} exists`);
    assert.equal(position.districtId, 'fengtai');
    assert.equal(position.recruitCount, recruits);
    const observation = dataset.observations.find((item) => item.year === 2026
      && item.positionCode === code && item.sourceId === sourceId);
    assert.equal(observation?.observationType, 'registration_snapshot');
    assert.equal(observation?.applicantsRegistered, applicants);
    assert.equal(observation?.applicantsQualified, null);
    assert.equal(observation?.observedAt, null);

    const evidence = getPositionCompetitionEvidence(position, {
      observations: dataset.observations,
      scoreRows: dataset.scoreRows,
    });
    assert.equal(evidence.registeredCompetitionRatio, applicants / recruits);
    assert.ok(evidence.registrationSourceIds.includes(sourceId));
  }

  const policePosition = dataset.positions.find((item) => item.year === 2026 && item.code === '232502201');
  const policeEvidence = getPositionCompetitionEvidence(policePosition, {
    observations: dataset.observations,
    scoreRows: dataset.scoreRows,
  });
  assert.equal(policeEvidence.qualifiedCompetitionRatio, 199 / 22);
  assert.equal(policeEvidence.registeredCompetitionRatio, 300 / 22);
  assert.equal(policeEvidence.cutoffScore, 52.15);
  assert.ok(policeEvidence.cutoffSourceIds.includes('cgzj-2026-fengtai-cutoff-sample'));
});
