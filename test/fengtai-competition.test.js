import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { normalizeDataset } from '../src/data/normalize.js';
import { getPositionCompetitionEvidence } from '../src/data/positions.js';

test('Fengtai 2026 reported applicant counts link to exact positions without implying official qualification counts', async () => {
  const raw = JSON.parse(await readFile(new URL('../public/data.json', import.meta.url), 'utf8'));
  const dataset = normalizeDataset(raw);
  const pages = dataset.sources.filter((source) => /^fengtai-2026-fenbi-page-[1-3]$/.test(source.sourceId));
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
  ];

  assert.equal(pages.length, 3);
  assert.equal(snapshots.length, expected.length);
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
