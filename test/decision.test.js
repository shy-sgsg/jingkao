import test from 'node:test';
import assert from 'node:assert/strict';
import { buildScoreEcdf, calculateDayCompletion, calculateSafeMargin, evaluateEligibility, evaluateMajorCode, getScoreSampleForYear, scoreAgainstSample, summarizeMockScores } from '../src/data/decision.js';

test('day completion reflects only logged inputs and status', () => {
  assert.equal(calculateDayCompletion({ plannedQuestions: 100, plannedHours: 5, status: '未开始' }), null);
  assert.equal(calculateDayCompletion({ plannedQuestions: 100, actualQuestions: 0, plannedHours: 5, actualHours: 0, status: '未开始' }), 0);
  assert.equal(calculateDayCompletion({ plannedQuestions: 100, plannedHours: 5, status: '进行中' }), 0.15);
  assert.equal(calculateDayCompletion({ plannedQuestions: 100, actualQuestions: 50, plannedHours: 5, actualHours: 2.5, status: '进行中' }), 0.5);
});

test('position eligibility stays pending when conditions are not structurally available', () => {
  assert.equal(evaluateEligibility({ eligibilityText: '专业条件摘要' }, { major: '公共管理' }).status, '信息不足');
});

test('a listed major category matches the applicant code within that category', () => {
  assert.equal(evaluateMajorCode({ degree: '本科', majorCode: '080202' }, { undergraduate: ['0802'] }).status, 'match');
  assert.equal(evaluateMajorCode({ degree: '本科', majorCode: '0803' }, { undergraduate: ['0802'] }).status, 'mismatch');
});

test('score scenario counts same-year historical cutoffs rather than reusing range counts', () => {
  const sample = { year: 2026, minimum: 106.25, maximum: 139.5, samplePositions: 31, complete: false };
  const rows = [
    { year: 2026, score: 140 },
    { year: 2026, score: 134.25 },
    { year: 2026, score: 125 },
    { year: 2025, score: 110 },
  ];
  const result = scoreAgainstSample(135, sample, rows);
  assert.equal(result.relation, 'within');
  assert.equal(result.coveredPositions, 2);
  assert.equal(result.totalPositions, 3);
  assert.equal(result.coverageRate, 2 / 3);
  assert.equal('probability' in result, false);
});

test('score samples are selected by exact year and missing years stay unavailable', () => {
  const sample = { year: 2026, minimum: 106.25, maximum: 139.5, samplePositions: 31 };
  assert.equal(getScoreSampleForYear([sample], 2026), sample);
  assert.equal(getScoreSampleForYear([sample], 2025), null);
  assert.equal(scoreAgainstSample(138, getScoreSampleForYear([sample], 2025), [{ year: 2025, score: 120 }]).coverageRate, null);
});

test('score ECDF groups ties and calculates cumulative coverage from the selected year only', () => {
  const distribution = buildScoreEcdf([
    { year: 2026, score: 120 },
    { year: 2026, score: 130 },
    { year: 2026, score: 130 },
    { year: 2026, score: 140 },
    { year: 2025, score: 100 },
  ], 2026);

  assert.equal(distribution.count, 4);
  assert.deepEqual(distribution.points.map((point) => [point.score, point.count, point.cumulativeCount, point.coverageRate]), [
    [120, 1, 1, 0.25],
    [130, 2, 3, 0.75],
    [140, 1, 4, 1],
  ]);
});

test('safe margin waits for five real mocks and a comparable job cutoff', () => {
  assert.equal(calculateSafeMargin([], 120).value, null);
  assert.match(calculateSafeMargin([{ total: 138 }], 120).status, /不足/);
  const partial = calculateSafeMargin([130, 132, 134].map((total) => ({ total })), 130);
  assert.equal(partial.value, null);
  assert.equal(partial.rawValue, 2);
  assert.equal(partial.sampleCount, 3);
  const mocks = [130, 132, 134, 136, 138].map((total) => ({ total }));
  assert.equal(calculateSafeMargin(mocks, null).value, null);
  assert.equal(calculateSafeMargin(mocks, 130).value, 4);
});

test('mock score summary separates all-time distribution from rolling three- and five-test means', () => {
  const summary = summarizeMockScores([100, 120, 130, 140, 150, 160].map((total) => ({ total })));
  assert.equal(summary.count, 6);
  assert.equal(summary.mean, 133.33333333333334);
  assert.equal(summary.median, 135);
  assert.equal(summary.minimum, 100);
  assert.equal(summary.maximum, 160);
  assert.equal(summary.last3Mean, 150);
  assert.equal(summary.last5Mean, 140);
  assert.ok(summary.standardDeviation > 19.7 && summary.standardDeviation < 19.8);
});

test('mock score summary leaves rolling means and single-score deviation unavailable when samples are too small', () => {
  const summary = summarizeMockScores([{ total: 138 }, { total: null }]);
  assert.equal(summary.count, 1);
  assert.equal(summary.standardDeviation, null);
  assert.equal(summary.last3Mean, null);
  assert.equal(summary.last5Mean, null);
});
