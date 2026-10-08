import test from 'node:test';
import assert from 'node:assert/strict';
import { summarizeAnnualConflicts } from '../src/data/findings.js';

const conflictRows = [
  { year: 2024, metric: 'position_count', value: 95, sourceId: 'huatu' },
  { year: 2024, metric: 'position_count', value: 93, sourceId: 'gwyzwb' },
  { year: 2024, metric: 'position_count', value: 97, sourceId: 'gaodun' },
  { year: 2024, metric: 'recruit_count', value: 197, sourceId: 'huatu' },
  { year: 2024, metric: 'recruit_count', value: 142, sourceId: 'gwyzwb' },
  { year: 2024, metric: 'recruit_count', value: 199, sourceId: 'gaodun' },
  { year: 2025, metric: 'position_count', value: 91, sourceId: 'huatu' },
  { year: 2025, metric: 'position_count', value: 91, sourceId: 'gwyzwb' },
  { year: 2025, metric: 'position_count', value: 90, sourceId: 'eoffcn' },
  { year: 2025, metric: 'recruit_count', value: 177, sourceId: 'huatu' },
  { year: 2025, metric: 'recruit_count', value: 177, sourceId: 'gwyzwb' },
  { year: 2025, metric: 'recruit_count', value: 176, sourceId: 'eoffcn' },
  { year: 2026, metric: 'position_count', value: 88, sourceId: 'huatu' },
  { year: 2026, metric: 'recruit_count', value: 138, sourceId: 'huatu' },
];

test('annual findings preserve source ranges instead of selecting a single disputed total', () => {
  const [year2024, year2025, year2026] = summarizeAnnualConflicts(conflictRows);

  assert.deepEqual(
    [year2024.positionCount.minimum, year2024.positionCount.maximum, year2024.positionCount.sourceCount],
    [93, 97, 3],
  );
  assert.deepEqual(
    [year2024.recruitCount.minimum, year2024.recruitCount.maximum, year2024.recruitCount.sourceCount],
    [142, 199, 3],
  );
  assert.equal(year2024.status, 'conflicting');
  assert.deepEqual(
    [year2025.positionCount.minimum, year2025.positionCount.maximum, year2025.recruitCount.minimum, year2025.recruitCount.maximum],
    [90, 91, 176, 177],
  );
  assert.equal(year2025.status, 'conflicting');
  assert.deepEqual(
    [year2026.positionCount.minimum, year2026.positionCount.maximum, year2026.sourceCount],
    [88, 88, 1],
  );
  assert.equal(year2026.status, 'single-source');
});

test('missing values remain unavailable and matching multi-source totals are not labeled conflicts', () => {
  const [missing] = summarizeAnnualConflicts([
    { year: 2027, metric: 'position_count', value: null, sourceId: 'empty' },
    { year: 2027, metric: 'recruit_count', value: null, sourceId: 'empty' },
  ], [2027]);
  const [aligned] = summarizeAnnualConflicts([
    { year: 2024, metric: 'position_count', value: 10, sourceId: 'a' },
    { year: 2024, metric: 'position_count', value: 10, sourceId: 'b' },
    { year: 2024, metric: 'recruit_count', value: 12, sourceId: 'a' },
    { year: 2024, metric: 'recruit_count', value: 12, sourceId: 'b' },
  ], [2024]);

  assert.deepEqual([missing.positionCount.minimum, missing.positionCount.maximum, missing.sourceCount], [null, null, 0]);
  assert.equal(missing.status, 'unavailable');
  assert.equal(aligned.status, 'aligned');
  assert.equal(aligned.sourceCount, 2);
});

test('annual summaries retain distinct source notes without duplicating paired metrics', () => {
  const [year2024] = summarizeAnnualConflicts([
    { year: 2024, metric: 'position_count', value: 95, sourceId: 'huatu', notes: '华图的职位数说明。' },
    { year: 2024, metric: 'recruit_count', value: 197, sourceId: 'huatu', notes: '华图的职位数说明。' },
    { year: 2024, metric: 'position_count', value: 93, sourceId: 'gwyzwb', notes: '职位网的单位范围说明。' },
    { year: 2024, metric: 'recruit_count', value: 142, sourceId: 'gwyzwb', notes: '计划招录人数说明。' },
  ], [2024]);

  assert.deepEqual(year2024.sourceNotes, [
    { sourceId: 'huatu', notes: ['华图的职位数说明。'] },
    { sourceId: 'gwyzwb', notes: ['职位网的单位范围说明。', '计划招录人数说明。'] },
  ]);
});
