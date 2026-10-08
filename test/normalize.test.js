import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeDataset } from '../src/data/normalize.js';

test('keeps unavailable counts null and does not invent zeros', () => {
  const dataset = normalizeDataset({
    positions: [{ year: 2026, code: '231263802', unit: '龙泽园街道', title: '综合行政执法岗', recruitCount: 1 }],
    observations: [{ positionCode: '231263802', applicantsQualified: null, applicantsPaid: null, actualTestTakers: null }],
    sources: [], studyPlan: [], aptitude: [], essay: [], mocks: [],
  });
  assert.equal(dataset.observations[0].applicantsQualified, null);
  assert.equal(dataset.observations[0].applicantsPaid, null);
  assert.equal(dataset.observations[0].actualTestTakers, null);
  assert.equal(dataset.observations[0].qualifiedCompetitionRatio, null);
});

test('computes only a qualified-applicant ratio from known inputs', () => {
  const dataset = normalizeDataset({
    positions: [{ year: 2024, code: '121256001', unit: '区委办公室', title: '综合调研岗', recruitCount: 1 }],
    observations: [{ positionCode: '121256001', applicantsQualified: 27 }],
    sources: [], studyPlan: [], aptitude: [], essay: [], mocks: [],
  });
  assert.equal(dataset.observations[0].qualifiedCompetitionRatio, 27);
});

test('does not calculate ratios with a missing or zero denominator', () => {
  const dataset = normalizeDataset({
    positions: [{ year: 2025, code: '221264701', unit: '水务局', title: '综合行政岗', recruitCount: null }],
    observations: [{ positionCode: '221264701', applicantsQualified: 20 }],
    sources: [], studyPlan: [], aptitude: [], essay: [], mocks: [],
  });
  assert.equal(dataset.observations[0].qualifiedCompetitionRatio, null);
});

test('preserves source conflicts and aggregate evidence independently', () => {
  const conflict = [{ metric: 'position_count', year: 2024, value: 95, sourceId: 'huatu' }, { metric: 'position_count', year: 2024, value: 93, sourceId: 'mirror' }];
  const dataset = normalizeDataset({ positions: [], observations: [], sources: [], studyPlan: [], aptitude: [], essay: [], mocks: [], conflicts: conflict });
  assert.deepEqual(dataset.conflicts, conflict);
});
