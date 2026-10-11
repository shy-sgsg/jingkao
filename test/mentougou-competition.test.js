import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { normalizeDataset } from '../src/data/normalize.js';
import { getPositionCompetitionEvidence } from '../src/data/positions.js';

const raw = JSON.parse(await readFile(new URL('../public/data.json', import.meta.url), 'utf8'));
const dataset = normalizeDataset(raw);

test('Mentougou Daitai judicial position links its reported count reference and interview cutoff', () => {
  const sourceId = 'fenbi-2026-mentougou-page-6';
  const source = dataset.sources.find((item) => item.sourceId === sourceId);
  assert.ok(source, `${sourceId} should be registered`);

  const snapshot = source.positionSnapshots?.find((item) => item.positionCode === '240948402');
  assert.equal(snapshot?.applicantsRegistered, 4);
  assert.equal(snapshot?.recruitCount, 1);

  const position = dataset.positions.find((item) => item.year === 2026 && item.code === '240948402');
  assert.ok(position, 'the Daitai judicial position should resolve to a local 2026 entry');
  assert.equal(position.districtId, 'mentougou');

  const evidence = getPositionCompetitionEvidence(position, dataset);
  assert.equal(evidence.registeredCompetitionRatio, 4);
  assert.equal(evidence.cutoffScore, 102.75);
  assert.deepEqual(evidence.registrationSourceIds, [sourceId]);
  assert.deepEqual(evidence.cutoffSourceIds, ['cgzj-2026-street-cutoff-sample']);
});
