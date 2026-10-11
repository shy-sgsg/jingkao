import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { normalizeDataset } from '../src/data/normalize.js';
import { getPositionCompetitionEvidence } from '../src/data/positions.js';

test('Shijingshan Fenbi pages 2-5 link every listed applicant count to the matching job', async () => {
  const raw = JSON.parse(await readFile(new URL('../public/data.json', import.meta.url), 'utf8'));
  const dataset = normalizeDataset(raw);
  const expectedByPage = {
    2: [
      ['220843801', 39, 1], ['820843901', 7, 1], ['220844101', 21, 2], ['220844201', 3, 1],
      ['820844303', 6, 2], ['820844301', 0, 1], ['820844302', 9, 1], ['820844401', 4, 1],
      ['820844402', 13, 2], ['820844502', 4, 1],
    ],
    3: [
      ['820844501', 22, 2], ['220844601', 9, 2], ['220844602', 7, 2], ['220844603', 11, 1],
      ['230844702', 11, 2], ['230844703', 9, 2], ['230844704', 9, 2], ['230844705', 21, 2],
      ['230844706', 91, 2], ['820844801', 20, 1],
    ],
    4: [
      ['230844901', 24, 2], ['230845002', 5, 2], ['230845102', 6, 2], ['230845201', 7, 2],
      ['230845202', 22, 2], ['230845301', 5, 2], ['230845302', 7, 2], ['230845401', 33, 2],
      ['230845501', 1, 2], ['230845601', 9, 2],
    ],
    5: [
      ['230845701', 5, 1], ['820844001', 3, 1], ['230844701', 1, 1], ['230845001', 7, 2],
      ['230845101', 3, 2],
    ],
  };

  const importedCodes = [];
  let applicantsTotal = 0;
  let recruitsTotal = 0;
  for (const [page, rows] of Object.entries(expectedByPage)) {
    const sourceId = `shijingshan-2026-fenbi-page-${page}`;
    const source = dataset.sources.find((item) => item.sourceId === sourceId);
    assert.ok(source, `${sourceId} source exists`);
    assert.match(source.url, new RegExp(`page=${page}&region=173`));
    assert.equal(source.districtId, 'shijingshan');

    for (const [code, applicants, recruits] of rows) {
      importedCodes.push(code);
      applicantsTotal += applicants;
      recruitsTotal += recruits;
      const position = dataset.positions.find((item) => item.year === 2026 && item.code === code);
      assert.ok(position, `position ${code} exists`);
      assert.equal(position.districtId, 'shijingshan', `${code} district`);
      assert.equal(position.recruitCount, recruits, `${code} recruit count`);

      const observation = dataset.observations.find((item) => item.year === 2026
        && item.positionCode === code && item.sourceId === sourceId);
      assert.equal(observation?.observationType, 'registration_snapshot', `${code} remains a reported-count reference`);
      assert.equal(observation?.applicantsRegistered, applicants, `${code} reported applicant count`);
      assert.equal(observation?.applicantsQualified, null, `${code} is not relabeled as a qualification count`);
      assert.equal(observation?.observedAt, null, `${code} has no source-reported timestamp`);

      const evidence = getPositionCompetitionEvidence(position, {
        observations: dataset.observations,
        scoreRows: dataset.scoreRows,
      });
      assert.equal(evidence.registeredCompetitionRatio, applicants / recruits, `${code} reported-count ratio`);
      assert.ok(evidence.registrationSourceIds.includes(sourceId), `${code} links to its page`);
    }
  }

  assert.equal(importedCodes.length, 35);
  assert.equal(new Set(importedCodes).size, 35);
  assert.equal(applicantsTotal, 454);
  assert.equal(recruitsTotal, 58);

  const positions = dataset.positions.filter((item) => item.year === 2026 && item.districtId === 'shijingshan');
  const evidenceRows = positions.map((position) => getPositionCompetitionEvidence(position, {
    observations: dataset.observations,
    scoreRows: dataset.scoreRows,
  }));
  assert.equal(positions.length, 45);
  assert.ok(evidenceRows.every((item) => item.registeredCompetitionRatio !== null));
  assert.equal(evidenceRows.filter((item) => item.cutoffScore !== null).length, 26);
  assert.equal(evidenceRows.filter((item) => item.cutoffScore !== null && item.registeredCompetitionRatio !== null).length, 26);
});
