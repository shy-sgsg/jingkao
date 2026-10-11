import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { getPositionCompetitionEvidence } from '../src/data/positions.js';

const dataset = JSON.parse(await readFile(new URL('../public/data.json', import.meta.url), 'utf8'));

test('new district applicant snapshots are linked only to exact local position codes and recruit counts', () => {
  const expected = new Map([
    ['changping-2026-fenbi-page-1', 10],
    ['shijingshan-2026-fenbi-page-1', 10],
    ['huairou-2026-fenbi-page-1', 10],
    ['yanqing-2026-fenbi-page-1', 10],
    ['shunyi-2026-fenbi-page-1', 8],
    ['pinggu-2026-fenbi-page-1', 3],
    ['miyun-2026-fenbi-page-1', 7],
  ]);
  const observations = dataset.observations.filter((row) => expected.has(row.sourceId));

  assert.equal(observations.length, 58);
  for (const [sourceId, expectedCount] of expected) {
    const rows = observations.filter((row) => row.sourceId === sourceId);
    assert.equal(rows.length, expectedCount, `${sourceId} should contain only exact local matches`);
    for (const row of rows) {
      const position = dataset.positions.find((item) => Number(item.year) === 2026 && item.code === row.positionCode);
      assert.ok(position, `${sourceId}/${row.positionCode} should resolve to a local position`);
      assert.equal(row.recruitCount, position.recruitCount);
      assert.equal(row.observationType, 'registration_snapshot');
      assert.equal(row.observedAt, null, 'do not invent a snapshot time absent from the page');
      assert.equal(row.applicantsQualified, null, 'do not reinterpret the page count as qualified applicants');
      assert.equal(getPositionCompetitionEvidence(position, dataset).registeredCompetitionRatio,
        row.applicantsRegistered / position.recruitCount);
    }
  }
});
